import { TestConnection } from "../lsp-testkit/connection.spec";
import { expect, plan } from "../testkit/chai.spec";
import { init } from "../../src/lib/server-utils";
import { MemoryFileSystem } from "kissfs";
import { toVscodePath } from "../../src/lib/utils/uri-utils";
import { TextDocumentItem } from "vscode-languageserver-protocol"
import { getRangeAndText } from "../testkit/text.spec";
import { Diagnostic, Range, Position, Location } from 'vscode-languageserver-types';
import { createRange, ProviderPosition } from '../../src/lib/completion-providers';
import { createColor } from './colors.spec';
import { timingFunctions } from 'polished';


function createDiagnosisNotification(range: Range, message: string, fileName: string) {
    return {
        diagnostics: [Diagnostic.create(range, message, 2, undefined, 'stylable')],
        uri: toVscodePath('/' + fileName)
    };
}

function trimLiteral(content: TemplateStringsArray, ...keys: string[]) {
    if (keys.length) { throw new Error('No support for expressions in pipe-delimited test files yet') };
    return content.join('\n').replace(/^\s*\|/gm, '').replace(/^\n/, '');
}


describe("Service component test", function () {
    let testCon: TestConnection;
    beforeEach(() => {
        testCon = new TestConnection();
        testCon.listen();
    });

    it("Diagnostics - single file error", plan(1, () => {
        const rangeAndText = getRangeAndText('|.gaga .root{}|');
        const fileName = 'single-file-diag.st.css';
        const fileSystem = new MemoryFileSystem('', { content: { [fileName]: rangeAndText.text } });

        testCon.client.onDiagnostics(d => {
            expect(d).to.eql(createDiagnosisNotification(rangeAndText.range, ".root class cannot be used after spacing", fileName));
        });

        init(fileSystem, testCon.server);
        const textDocument = TextDocumentItem.create(toVscodePath('/' + fileName), 'stylable', 0, fileSystem.loadTextFileSync(fileName));
        testCon.client.didOpenTextDocument({ textDocument });
    }));

    it("Document Colors - local, vars, imported", plan(2, async () => {
        const baseFilecContent = `
        :vars {
            myColor: rgba(0, 255, 0, 0.8);
        }

        .root {
            color: value(myColor);
        }
        `
        const importFileContent = `
        :import {
            -st-from: "./single-file-color.st.css";
            -st-named: myColor;
        }
        `

        const baseFileName = 'single-file-color.st.css';
        const importFileName = 'import-color.st.css';
        const fileSystem = new MemoryFileSystem('', { content: { [baseFileName]: baseFilecContent, [importFileName]: importFileContent } });
        const baseTextDocument = TextDocumentItem.create(toVscodePath('/' + baseFileName), 'stylable', 0, baseFilecContent);
        const importTextDocument = TextDocumentItem.create(toVscodePath('/' + importFileName), 'stylable', 0, importFileContent);

        const range1 = createRange(6, 19, 6, 32);
        const range2 = createRange(2, 21, 2, 41);
        const range3 = createRange(3, 23, 3, 30);
        const color = createColor(0, 1, 0, 0.8);

        init(fileSystem, testCon.server);

        const docColors = await testCon.client.documentColor({ textDocument: baseTextDocument });
        const importDocColors = await testCon.client.documentColor({ textDocument: importTextDocument });

        expect(docColors).to.eql([{
            range: range1,
            color: color
        },
        {
            range: range2,
            color: color
        }]);

        expect(importDocColors).to.eql([{
            range: range3,
            color: color
        }]);
    }));

    it("References - local file", plan(3, async () => {
        const fileText = trimLiteral`
            |  .gaga {
            |   -st-states: active;
            |    color: red;
            |}
            |
            |.gaga:active .gaga {
            |    background-color: fuchsia;
            |}
            |
            |.lokal {
            |    -st-extends:      gaga;
            |}
            |
            |.mixed {
            |    -st-mixin: lokal,
            |    gaga, lokal,
            |    gaga;
            |}`

        const fileName = 'references.st.css';
        const fileSystem = new MemoryFileSystem('', { content: { [fileName]: fileText } });

        init(fileSystem, testCon.server);
        const context = { includeDeclaration: true }
        const textDocument = TextDocumentItem.create(toVscodePath('/' + fileName), 'stylable', 0, fileSystem.loadTextFileSync(fileName));
        const refsInSelector = await testCon.client.references({ context, textDocument, position: { line: 5, character: 16 } })
        const refsInMixin = await testCon.client.references({ context, textDocument, position: { line: 10, character: 25 } })
        const refsInExtends = await testCon.client.references({ context, textDocument, position: { line: 15, character: 6 } })
        const expectedRefs = [ //Refs should be listed in the order they appear in the file
            Location.create(textDocument.uri, createRange(0, 3, 0, 7)),
            Location.create(textDocument.uri, createRange(5, 1, 5, 5)),
            Location.create(textDocument.uri, createRange(5, 14, 5, 18)),
            Location.create(textDocument.uri, createRange(10, 22, 10, 26)),
            Location.create(textDocument.uri, createRange(15, 4, 15, 8)),
            Location.create(textDocument.uri, createRange(16, 4, 16, 8))
        ]

        expect(refsInSelector).to.eql(expectedRefs);
        expect(refsInMixin).to.eql(expectedRefs);
        expect(refsInExtends).to.eql(expectedRefs);
    }));

    it("Definitions - element", plan(5, async () => {
        const topFileText = trimLiteral`
        |:import {
        |    -st-from: "./import.st.css";
        |    -st-named: momo;
        |}
        |
        |.local {
        |    -st-extends: momo;
        |}
        |
        |.local:momo {
        |    color: blue;
        |}`

        const importFileText = trimLiteral`
        |.shlomo {
        |    color: black;
        |}
        |
        |.momo {
        |    -st-states: anotherState,oneMoreState;
        |}
        |
        |.root .momo {
        |    color: goldenrod;
        |}
        `
        const topFileName = 'top.st.css';
        const importFileName = 'import.st.css';
        const fileSystem = new MemoryFileSystem('', { content: { [topFileName]: topFileText, [importFileName]: importFileText } });
        const topTextDocument = TextDocumentItem.create(toVscodePath('/' + topFileName), 'stylable', 0, topFileText);
        const importTextDocument = TextDocumentItem.create(toVscodePath('/' + importFileName), 'stylable', 0, importFileText);
        const topFilelocations = [
            { line: 2, character: 17 },
            { line: 6, character: 18 },
            { line: 9, character: 7 },
        ]
        const importFilelocations = [
            { line: 4, character: 3 },
            { line: 8, character: 10 },
        ]

        init(fileSystem, testCon.server);
        topFilelocations.forEach(async loc => {
            const def = await testCon.client.definition({ position: loc, textDocument: topTextDocument });
            expect(def).to.eql([{
                uri: importTextDocument.uri,
                range: createRange(4, 1, 4, 5)
            }]);
        });
        importFilelocations.forEach(async loc => {
            const def = await testCon.client.definition({ position: loc, textDocument: importTextDocument });
            expect(def).to.eql([{
                uri: importTextDocument.uri,
                range: createRange(4, 1, 4, 5)
            }]);
        })

    }));
});