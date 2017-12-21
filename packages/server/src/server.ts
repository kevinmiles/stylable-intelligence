'use strict';
import { setInterval } from 'timers';
import * as path from 'path';
import { CompletionItem, createConnection, IConnection, InitializeResult, InsertTextFormat, IPCMessageReader, IPCMessageWriter, TextDocuments, TextEdit, Location, Definition, Hover, TextDocument, Range, Position, ServerCapabilities, SignatureHelp, NotificationType, RequestType, RequestType0, Command } from 'vscode-languageserver';
import { createProvider, } from './provider-factory';
import { ProviderPosition, ProviderRange } from './completion-providers';
import { Completion } from './completion-types';
import { createDiagnosis } from './diagnosis';
import * as VCL from 'vscode-css-languageservice';
import { ServerCapabilities as CPServerCapabilities, DocumentColorRequest, ColorPresentationRequest } from 'vscode-languageserver-protocol/lib/protocol.colorProvider.proposed';
import { valueMapping } from 'stylable/dist/src/stylable-value-parsers';
import { fileUriToNativePath, nativePathToFileUri } from './utils/uri-utils';


namespace OpenDocNotification {
    export const type = new NotificationType<string, void>('stylable/openDocumentNotification');
}

const connection: IConnection = createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));
const documents: TextDocuments = new TextDocuments();

const provider = createProvider(documents);
const processor = provider.styl.fileProcessor;
const cssService = VCL.getCSSLanguageService();

documents.listen(connection);

connection.onInitialize((params): InitializeResult => {
    return {
        capabilities: ({
            textDocumentSync: documents.syncKind,
            completionProvider: {
                triggerCharacters: ['.', '-', ':', '"', ',']
            },
            definitionProvider: true,
            hoverProvider: true,
            referencesProvider: true,
            colorProvider: true,
            signatureHelpProvider: {
                triggerCharacters: [
                    '(',
                    ','
                ]
            },
        } as CPServerCapabilities & ServerCapabilities)
    }
});

connection.listen();

function getRequestedFiles(doc: string, origin: string): string[] {
    const originNativePath = fileUriToNativePath(origin)
    const originDir = path.dirname(originNativePath);

    return doc
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.startsWith(valueMapping.from))
        .map(l => path.join(originDir, l.slice('-st-from'.length + 1, l.indexOf(';')).replace(/"/g, '').replace(/'/g, "").trim()))
        .map(nativePathToFileUri);
}

connection.onCompletion((params): Thenable<CompletionItem[]> => {
    // debugger;
    if (!params.textDocument.uri.endsWith('.st.css') && !params.textDocument.uri.startsWith('untitled:')) { return Promise.resolve([]) }
    let cssCompsRaw = cssService.doComplete(documents.get(params.textDocument.uri), params.position, cssService.parseStylesheet(documents.get(params.textDocument.uri)))

    const doc = documents.get(params.textDocument.uri).getText();
    const pos = params.position;

    const requestedFiles = getRequestedFiles(doc, params.textDocument.uri);
    requestedFiles.forEach(file => connection.sendNotification(OpenDocNotification.type, file));

    return new Promise((resolve) => {
        const interval = setInterval(() => {
            if (requestedFiles.every(file => !!documents.get(file))) {
                clearInterval(interval);
                resolve()
            }
        }, 100);
    }).then(() => {

        return provider.provideCompletionItemsFromSrc(doc, { line: pos.line, character: pos.character }, params.textDocument.uri, documents)
            .then((res) => {
                return res.map((com: Completion) => {
                    let lspCompletion = CompletionItem.create(com.label);
                    let ted: TextEdit = TextEdit.replace(
                        com.range ? com.range : new ProviderRange(new ProviderPosition(pos.line, Math.max(pos.character - 1, 0)), pos),
                        typeof com.insertText === 'string' ? com.insertText : com.insertText.source)
                    lspCompletion.insertTextFormat = InsertTextFormat.Snippet;
                    lspCompletion.detail = com.detail;
                    lspCompletion.textEdit = ted;
                    lspCompletion.sortText = com.sortText;
                    lspCompletion.filterText = typeof com.insertText === 'string' ? com.insertText : com.insertText.source;
                    if (com.additionalCompletions) {
                        lspCompletion.command = Command.create("additional", "editor.action.triggerSuggest")
                    } else if (com.triggerSignature) {
                        lspCompletion.command = Command.create("additional", "editor.action.triggerParameterHints")
                    }
                    return lspCompletion;
                }).concat(cssCompsRaw ? cssCompsRaw.items : [])
            });
    })

});

documents.onDidChangeContent(function (change) {

    let cssDiags =
        change.document.uri.endsWith('.css')
            ? cssService.doValidation(change.document, cssService.parseStylesheet(change.document))
                .filter(diag => {
                    if (diag.code === 'emptyRules') { return false; }
                    if (diag.code === 'css-unknownatrule' && readDocRange(change.document, diag.range) === '@custom-selector') { return false; }
                    if (diag.code === 'css-lcurlyexpected' && readDocRange(change.document, Range.create(Position.create(diag.range.start.line, 0), diag.range.end)).startsWith('@custom-selector')) { return false; }
                    if (diag.code === 'unknownProperties') {
                        return false;
                    }
                    return true;
                })
                .map(diag => {
                    diag.source = 'css';
                    return diag;
                })
            : [];

    let diagnostics = createDiagnosis(change.document, processor).map(diag => { diag.source = 'stylable'; return diag; });
    connection.sendDiagnostics({ uri: change.document.uri, diagnostics: diagnostics.concat(cssDiags) })
});


connection.onDefinition((params): Thenable<Definition> => {
    const doc = documents.get(params.textDocument.uri).getText();
    const pos = params.position;
    return provider.getDefinitionLocation(doc, { line: pos.line, character: pos.character }, params.textDocument.uri)
        .then((res) => {
            return res.map(loc => Location.create('file://' + loc.uri, loc.range))
        });
});

connection.onHover((params): Thenable<Hover> => {
    let hover = cssService.doHover(documents.get(params.textDocument.uri), params.position, cssService.parseStylesheet(documents.get(params.textDocument.uri)));
    return Promise.resolve(hover!) //Because Hover may be null, but not of null type - vscode code isn't strict that way.
});

connection.onReferences((params): Thenable<Location[]> => {
    let refs = cssService.findReferences(documents.get(params.textDocument.uri), params.position, cssService.parseStylesheet(documents.get(params.textDocument.uri)))

    return Promise.resolve(refs)
});

connection.onRequest(DocumentColorRequest.type, params => {
    const document = documents.get(params.textDocument.uri);
    const stylesheet: VCL.Stylesheet = cssService.parseStylesheet(document);
    const colors = cssService.findDocumentColors(document, stylesheet)
    return colors;
});

connection.onRequest(ColorPresentationRequest.type, params => {
    const document = documents.get(params.textDocument.uri);
    const stylesheet: VCL.Stylesheet = cssService.parseStylesheet(document);
    const colors = cssService.getColorPresentations(document, stylesheet, params.color, params.range)
    return colors;

});


connection.onSignatureHelp((params): Thenable<SignatureHelp> => {

    const doc: string = documents.get(params.textDocument.uri).getText();
    // let lines = doc.split('\n').map(l => l.trim());
    // let vals: string[] = [];
    // lines.forEach(l => {
    //     if (l.startsWith(valueMapping.from)) {
    //         let val = path.join(path.dirname(params.textDocument.uri.slice(7)), l.slice('-st-from'.length + 1, l.indexOf(';')).replace(/"/g, '').replace(/'/g, "").trim());
    //         if (!documents.get(val)) {vals.push(val)};
    //         connection.sendNotification(OpenDocNotification.type, val);
    //     }
    // })

    // function waitForVals() {
    //     return new Promise(resolve => {
    //         setInterval(
    //             () => {
    //                 if (vals.every(val => {return !!documents.get('file://' + val)})) {resolve()}
    //             },
    //             100
    //         )
    //     })
    // }

    // return waitForVals().then(() => {
    // console.log('why?!')
    const requestedFiles = getRequestedFiles(doc, params.textDocument.uri);
    requestedFiles.forEach(file => connection.sendNotification(OpenDocNotification.type, file));

    return new Promise((resolve) => {
        const interval = setInterval(() => {
            if (requestedFiles.every(file => !!documents.get(file))) {
                clearInterval(interval);
                resolve()
            }
        }, 100);
    }).then(() => {
        let sig = provider.getSignatureHelp(doc, params.position, params.textDocument.uri, documents);
        return Promise.resolve(sig!)
    })
})

function readDocRange(doc: TextDocument, rng: Range): string {
    let lines = doc.getText().split('\n');
    return lines[rng.start.line].slice(rng.start.character, rng.end.character);
}
