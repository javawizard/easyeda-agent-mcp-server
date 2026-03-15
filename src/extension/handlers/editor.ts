/**
 * Recursively strip keys that are useless to LLMs (e.g. titleBlockData, showTitleBlock).
 * Mutates in place for efficiency — callers should pass a fresh copy if needed.
 */
function stripBloat(obj: any): any {
	if (obj == null || typeof obj !== 'object') return obj;
	if (Array.isArray(obj)) {
		for (const item of obj) stripBloat(item);
		return obj;
	}
	delete obj.titleBlockData;
	delete obj.showTitleBlock;
	for (const val of Object.values(obj)) {
		if (val && typeof val === 'object') stripBloat(val);
	}
	return obj;
}

async function blobToBase64(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const dataUrl = reader.result as string;
			resolve(dataUrl.split(',')[1] || '');
		};
		reader.onerror = () => reject(new Error('Failed to read image blob'));
		reader.readAsDataURL(blob);
	});
}

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export const editorHandlers: Record<string, (params: Record<string, any>) => Promise<any>> = {
	'editor.project.getStructure': async () => {
		const [project, currentDoc] = await Promise.all([
			eda.dmt_Project.getCurrentProjectInfo(),
			eda.dmt_SelectControl.getCurrentDocumentInfo(),
		]);
		return { project: stripBloat(project), currentDocument: currentDoc };
	},

	'editor.getCurrentDocument': async () => {
		const doc = await eda.dmt_SelectControl.getCurrentDocumentInfo();
		if (!doc) {
			return { document: undefined };
		}

		const result: Record<string, any> = { document: doc };

		// Schematic page (documentType 1)
		if (doc.documentType === 1) {
			const [page, schematic] = await Promise.all([
				eda.dmt_Schematic.getCurrentSchematicPageInfo(),
				eda.dmt_Schematic.getCurrentSchematicInfo(),
			]);
			result.schematicPage = page;
			result.schematic = schematic;
		}

		// PCB (documentType 3)
		if (doc.documentType === 3) {
			const [pcb, board] = await Promise.all([
				eda.dmt_Pcb.getCurrentPcbInfo(),
				eda.dmt_Board.getCurrentBoardInfo(),
			]);
			result.pcb = pcb;
			result.board = board;
		}

		return result;
	},

	'editor.openDocument': async (params) => {
		return eda.dmt_EditorControl.openDocument(params.documentUuid);
	},

	'editor.getOpenTabs': async () => {
		const [tree, currentDoc] = await Promise.all([
			eda.dmt_EditorControl.getSplitScreenTree(),
			eda.dmt_SelectControl.getCurrentDocumentInfo(),
		]);

		const tabs: Array<{ title: string; tabId: string; isActive: boolean }> = [];
		const activeUuid = currentDoc?.uuid;

		function collectTabs(node: any): void {
			if (node.tabs) {
				for (const tab of node.tabs) {
					tabs.push({
						title: tab.title,
						tabId: tab.tabId,
						isActive: activeUuid ? tab.tabId.startsWith(activeUuid) : false,
					});
				}
			}
			if (node.children) {
				for (const child of node.children) {
					collectTabs(child);
				}
			}
		}

		if (tree) {
			collectTabs(tree);
		}

		return { tabs, splitScreenTree: tree };
	},

	'editor.captureScreenshot': async (params) => {
		const mode: string = params.mode || 'full';

		const doc = await eda.dmt_SelectControl.getCurrentDocumentInfo();
		const docType = doc?.documentType; // 1=sch, 3=pcb

		// Adjust viewport based on mode
		let viewportInfo: any = undefined;
		let savedSelection: string[] | undefined;

		if (mode === 'full') {
			viewportInfo = await eda.dmt_EditorControl.zoomToAllPrimitives();
		} else if (mode === 'board' && docType === 3) {
			await eda.dmt_EditorControl.zoomToBoardOutline();
		} else if (mode === 'board' && docType !== 3) {
			// Fall back to full for schematics
			viewportInfo = await eda.dmt_EditorControl.zoomToAllPrimitives();
		} else if (mode === 'region') {
			const { left, right, top, bottom } = params;
			if (left == null || right == null || top == null || bottom == null) {
				throw new Error('Region mode requires left, right, top, bottom parameters');
			}
			await eda.dmt_EditorControl.zoomToRegion(left, right, top, bottom);
		} else if (mode === 'components') {
			const primitiveIds: string[] = params.primitiveIds;
			if (!primitiveIds || primitiveIds.length === 0) {
				throw new Error('Components mode requires a non-empty primitiveIds array');
			}

			// Save current selection
			if (docType === 3) {
				savedSelection = await eda.pcb_SelectControl.getAllSelectedPrimitives_PrimitiveId();
				await eda.pcb_SelectControl.doSelectPrimitives(primitiveIds);
			} else if (docType === 1) {
				savedSelection = await eda.sch_SelectControl.getAllSelectedPrimitives_PrimitiveId();
				await eda.sch_SelectControl.doSelectPrimitives(primitiveIds);
			}

			viewportInfo = await eda.dmt_EditorControl.zoomToSelectedPrimitives();
		}
		// mode === 'current' — no viewport change

		// Give the renderer a moment to finish redrawing after viewport change
		if (mode !== 'current') {
			await delay(200);
		}

		const blob = await eda.dmt_EditorControl.getCurrentRenderedAreaImage();
		if (!blob) {
			throw new Error('Failed to capture screenshot — no image returned');
		}

		// Restore previous selection if we changed it
		if (mode === 'components' && savedSelection !== undefined) {
			if (docType === 3) {
				await eda.pcb_SelectControl.clearSelected();
				if (savedSelection.length > 0) {
					await eda.pcb_SelectControl.doSelectPrimitives(savedSelection);
				}
			} else if (docType === 1) {
				eda.sch_SelectControl.clearSelected();
				if (savedSelection.length > 0) {
					await eda.sch_SelectControl.doSelectPrimitives(savedSelection);
				}
			}
		}

		const base64 = await blobToBase64(blob);

		return {
			image: base64,
			mimeType: 'image/png',
			size: blob.size,
			viewport: viewportInfo || undefined,
		};
	},
};
