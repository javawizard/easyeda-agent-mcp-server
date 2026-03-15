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

async function fileToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const dataUrl = reader.result as string;
			resolve(dataUrl.split(',')[1] || '');
		};
		reader.onerror = () => reject(new Error('Failed to read file'));
		reader.readAsDataURL(file);
	});
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
		const doc = await eda.dmt_SelectControl.getCurrentDocumentInfo();
		const docType = doc?.documentType; // 1=sch, 3=pcb

		if (docType === 1) {
			// Schematic: use getExportDocumentFile for reliable PNG export
			const theme = params.theme || 'Default';
			const scope = params.scope || 'Current Schematic Page';
			const file = await eda.sch_ManufactureData.getExportDocumentFile(
				'screenshot.png',
				'PNG' as any,
				{ theme, lineWidth: 'Default' },
				scope,
			);
			if (!file) {
				throw new Error('Failed to export schematic image');
			}
			const base64 = await fileToBase64(file);
			return { image: base64, mimeType: 'image/png', size: file.size };
		}

		if (docType === 3) {
			// PCB: try canvas capture first, fall back to PDF export
			try {
				const blob = await eda.dmt_EditorControl.getCurrentRenderedAreaImage();
				if (blob && blob.size > 0) {
					const base64 = await blobToBase64(blob);
					return { image: base64, mimeType: 'image/png', size: blob.size };
				}
			} catch {
				// Canvas capture not available — fall back to PDF
			}

			// PDF fallback
			const file = await eda.pcb_ManufactureData.getPdfFile('screenshot.pdf');
			if (!file) {
				throw new Error('Failed to export PCB image');
			}
			const base64 = await fileToBase64(file);
			return { image: base64, mimeType: 'application/pdf', size: file.size, format: 'pdf' };
		}

		throw new Error(`Cannot capture screenshot for document type ${docType ?? 'unknown'} — open a schematic or PCB first`);
	},
};
