import { createRange } from '../../src/lib/completion-providers';
import { expect } from 'chai';
import * as path from 'path';
import { getReferences, CASES_PATH } from '../../test-kit/asserters';
import { toVscodePath } from '../../src/lib/utils/uri-utils';
import { Location } from 'vscode-languageclient/lib/main';

describe("References", function () {
    describe("Local Classes", function () {
        it("should return all instances of local class when called from selector ", function () {
            const refs = getReferences('references/local-class-from-selector.st.css', { line: 5, character: 16 });
            expect(refs.length).to.equal(6);
            expect(refs[0].range).to.deep.equal(createRange(0, 3, 0, 7));
            expect(refs[1].range).to.deep.equal(createRange(5, 1, 5, 5));
            expect(refs[2].range).to.deep.equal(createRange(5, 14, 5, 18));
            expect(refs[3].range).to.deep.equal(createRange(10, 22, 10, 26));
            expect(refs[4].range).to.deep.equal(createRange(15, 4, 15, 8));
            expect(refs[5].range).to.deep.equal(createRange(16, 4, 16, 8));
            refs.forEach(ref => {
                expect(ref.uri).to.equal(toVscodePath(path.join(CASES_PATH, 'references/local-class-from-selector.st.css')));
            })
        });
        it("should return all instances of local class when called from -st-mixin ", function () {
            const refs = getReferences('references/local-class-from-selector.st.css', { line: 15, character: 6 });
            expect(refs.length).to.equal(6);
            expect(refs[0].range).to.deep.equal(createRange(0, 3, 0, 7));
            expect(refs[1].range).to.deep.equal(createRange(5, 1, 5, 5));
            expect(refs[2].range).to.deep.equal(createRange(5, 14, 5, 18));
            expect(refs[3].range).to.deep.equal(createRange(10, 22, 10, 26));
            expect(refs[4].range).to.deep.equal(createRange(15, 4, 15, 8));
            expect(refs[5].range).to.deep.equal(createRange(16, 4, 16, 8));
            refs.forEach(ref => {
                expect(ref.uri).to.equal(toVscodePath(path.join(CASES_PATH, 'references/local-class-from-selector.st.css')));
            })
        });
        it("should return all instances of local class when called from -st-extends ", function () {
            const refs = getReferences('references/local-class-from-selector.st.css', { line: 10, character: 25 });
            expect(refs.length).to.equal(6);
            expect(refs[0].range).to.deep.equal(createRange(0, 3, 0, 7));
            expect(refs[1].range).to.deep.equal(createRange(5, 1, 5, 5));
            expect(refs[2].range).to.deep.equal(createRange(5, 14, 5, 18));
            expect(refs[3].range).to.deep.equal(createRange(10, 22, 10, 26));
            expect(refs[4].range).to.deep.equal(createRange(15, 4, 15, 8));
            expect(refs[5].range).to.deep.equal(createRange(16, 4, 16, 8));
            refs.forEach(ref => {
                expect(ref.uri).to.equal(toVscodePath(path.join(CASES_PATH, 'references/local-class-from-selector.st.css')));
            })
        });
    });

    describe("Local Variables", function () {
        it("Should return all instances of local variable when called from varaiable definition", function () {
            const refs = getReferences('references/local-var-from-def.st.css', { line: 2, character: 7 });
            expect(refs.length).to.equal(2);
            expect(refs[0].range).to.deep.equal(createRange(2, 4, 2, 10));
            expect(refs[1].range).to.deep.equal(createRange(6, 31, 6, 37));

        });

        it("Should return all instances of local variable when called from varaiable usage", function () {
            const refs = getReferences('references/local-var-from-def.st.css', { line: 6, character: 33 });
            expect(refs.length).to.equal(2);
            expect(refs[0].range).to.deep.equal(createRange(2, 4, 2, 10));
            expect(refs[1].range).to.deep.equal(createRange(6, 31, 6, 37));
        });

    });

    describe("Cross-File References", function () {
        describe("Variables", function () {
            //Definition, usage, named import, usage of import
            it("Should return all instances of variable across file", function () {
                const refs = getReferences('references/vars.st.css', { line: 6, character: 20 });
                const path1 = toVscodePath(path.join(CASES_PATH, 'references/vars.st.css'));
                const path2 = toVscodePath(path.join(CASES_PATH, 'references/var-import.st.css'));
                const path3 = toVscodePath(path.join(CASES_PATH, 'references/other-var.st.css'));
                const exp1 = { uri: path1, range: createRange(2, 15, 2, 22) };
                const exp2 = { uri: path1, range: createRange(6, 17, 6, 24) };
                const exp3 = { uri: path2, range: createRange(1, 4, 1, 11) };
                const exp4 = { uri: path2, range: createRange(5, 17, 5, 24) };
                const bad1 = { uri: path3, range: createRange(1, 4, 1, 11) };
                const bad2 = { uri: path3, range: createRange(5, 17, 5, 24) };

                expect(refs.length).to.equal(4);
                expect(refs).to.deep.include(exp1);
                expect(refs).to.deep.include(exp2);
                expect(refs).to.deep.include(exp3);
                expect(refs).to.deep.include(exp4);
                //Not include different vars with same name
                expect(refs).to.not.deep.include(bad1);
                expect(refs).to.not.deep.include(bad2);

            })
        });
        describe("Classes and Pseudo-elements", function () {
            const path1 = 'references/classes-top.st.css';
            const path2 = 'references/classes-import-default.st.css';
            const path3 = 'references/classes-import-named.st.css';
            it("Should find all references to aaa", function () {
                const positions = [
                    { path: path1, line: 4, character: 3 },
                    { path: path1, line: 13, character: 18 },
                    { path: path2, line: 11, character: 9 },
                    { path: path3, line: 5, character: 9 },
                    { path: path3, line: 2, character: 16 },
                ]
                const vscodePath1 = toVscodePath(path.join(CASES_PATH, path1));
                const vscodePath2 = toVscodePath(path.join(CASES_PATH, path2));
                const vscodePath3 = toVscodePath(path.join(CASES_PATH, path3));
                const exp1 = { uri: vscodePath1, range: createRange(4, 1, 4, 4) };
                const exp2 = { uri: vscodePath1, range: createRange(13, 17, 13, 20) };
                const exp3 = { uri: vscodePath2, range: createRange(11, 8, 11, 11) };
                const exp4 = { uri: vscodePath3, range: createRange(5, 7, 5, 10) };
                const exp5 = { uri: vscodePath3, range: createRange(2, 15, 2, 18) };
                const bad1 = { uri: vscodePath2, range: createRange(17, 1, 17, 4) };
                positions.forEach(pos => {
                    let refs = getReferences(pos.path, pos);
                    expect(refs.length).to.equal(5);
                    expect(refs).to.deep.include(exp1);
                    expect(refs).to.deep.include(exp2);
                    expect(refs).to.deep.include(exp3);
                    expect(refs).to.deep.include(exp4);
                    expect(refs).to.deep.include(exp5);
                    //Not include different vars with same name
                    expect(refs).to.not.deep.include(bad1);
                })
            });

            it("Should find all references to bbb", function () {
                const positions = [
                    { path: path1, line: 8, character: 3 },
                    { path: path3, line: 2, character: 19 },
                    { path: path3, line: 14, character: 16 },
                    { path: path3, line: 5, character: 13 },
                ]
                const vscodePath1 = toVscodePath(path.join(CASES_PATH, path1));
                const vscodePath3 = toVscodePath(path.join(CASES_PATH, path3));
                const exp1 = { uri: vscodePath1, range: createRange(8, 1, 8, 4) };
                const exp2 = { uri: vscodePath3, range: createRange(2, 19, 2, 22) };
                const exp3 = { uri: vscodePath3, range: createRange(14, 15, 14, 18) };
                const exp4 = { uri: vscodePath3, range: createRange(5, 12, 5, 15) };
                positions.forEach(pos => {
                    let refs = getReferences(pos.path, pos);
                    expect(refs.length).to.equal(4);
                    expect(refs).to.deep.include(exp1);
                    expect(refs).to.deep.include(exp2);
                    expect(refs).to.deep.include(exp3);
                    expect(refs).to.deep.include(exp4);
                })
            });

            it("Should find all references to ccc", function () {
                const positions = [
                    { path: path1, line: 12, character: 3 },
                    { path: path2, line: 13, character: 15 },
                    { path: path3, line: 2, character: 24 },
                    { path: path3, line: 5, character: 19 },
                    { path: path3, line: 10, character: 18 },
                ]
                const vscodePath1 = toVscodePath(path.join(CASES_PATH, path1));
                const vscodePath2 = toVscodePath(path.join(CASES_PATH, path2));
                const vscodePath3 = toVscodePath(path.join(CASES_PATH, path3));
                const exp1 = { uri: vscodePath1, range: createRange(12, 1, 12, 4) };
                const exp2 = { uri: vscodePath2, range: createRange(13, 13, 13, 16) };
                const exp3 = { uri: vscodePath3, range: createRange(2, 23, 2, 26) };
                const exp4 = { uri: vscodePath3, range: createRange(5, 17, 5, 20) };
                const exp5 = { uri: vscodePath3, range: createRange(10, 17, 10, 20) };

                const bad1 = { uri: vscodePath1, range: createRange(16, 9, 16, 12) };

                positions.slice(0, 1).forEach(pos => {
                    let refs = getReferences(pos.path, pos);
                    expect(refs.length).to.equal(5);
                    expect(refs).to.deep.include(exp1);
                    expect(refs).to.deep.include(exp2);
                    expect(refs).to.deep.include(exp3);
                    expect(refs).to.deep.include(exp4);
                    expect(refs).to.deep.include(exp5);

                    expect(refs).to.not.deep.include(bad1);
                })
            });
        });
        describe("States", function () {
            const path1 = 'definitions/states-import.st.css';
            const path2 = 'definitions/states-named.st.css';
            const path3 = 'definitions/states-default.st.css';
            const path4 = 'definitions/states-deep.st.css';
            const path5 = 'definitions/states-very-deep.st.css';
            const vscodePath1 = toVscodePath(path.join(CASES_PATH, path1));
            const vscodePath2 = toVscodePath(path.join(CASES_PATH, path2));
            const vscodePath3 = toVscodePath(path.join(CASES_PATH, path3));
            const vscodePath4 = toVscodePath(path.join(CASES_PATH, path4));
            const vscodePath5 = toVscodePath(path.join(CASES_PATH, path5));
            let positions = [
                { path: path1, line: 5, character: 20 },
                { path: path2, line: 5, character: 15 },
                { path: path3, line: 7, character: 30 },
                { path: path3, line: 18, character: 18 },
            ]
            positions.forEach(pos => {
                it("Should find all references to topState on element 'one' in " + pos.path + " at " + JSON.stringify(pos), function () {
                    const exp1 = { uri: vscodePath1, range: createRange(5, 16, 5, 24) };
                    const exp2 = { uri: vscodePath2, range: createRange(5, 11, 5, 19) };
                    const exp3 = { uri: vscodePath3, range: createRange(7, 26, 7, 34) };
                    const exp4 = { uri: vscodePath3, range: createRange(18, 12, 18, 20) };
                    let refs = getReferences(pos.path, pos);
                    expect(refs.length).to.equal(4);
                    expect(refs).to.deep.include(exp1);
                    expect(refs).to.deep.include(exp2);
                    expect(refs).to.deep.include(exp3);
                    expect(refs).to.deep.include(exp4);
                })
            })

            positions = [
                { path: path1, line: 9, character: 20 },
                { path: path2, line: 7, character: 15 },
                { path: path3, line: 9, character: 20 },
                { path: path3, line: 20, character: 28 },
            ]
            positions.forEach(pos => {
                it("Should find all references to topState on element 'two' in " + pos.path + " at " + JSON.stringify(pos), function () {
                    const exp1 = { uri: vscodePath1, range: createRange(9, 16, 9, 24) };
                    const exp2 = { uri: vscodePath2, range: createRange(7, 11, 7, 19) };
                    const exp3 = { uri: vscodePath3, range: createRange(9, 16, 9, 24) };
                    const exp4 = { uri: vscodePath3, range: createRange(20, 22, 20, 30) };
                    let refs = getReferences(pos.path, pos);
                    expect(refs.length).to.equal(4);
                    expect(refs).to.deep.include(exp1);
                    expect(refs).to.deep.include(exp2);
                    expect(refs).to.deep.include(exp3);
                    expect(refs).to.deep.include(exp4);
                })
            })

            positions = [
                { path: path3, line: 13, character: 20 },
                { path: path3, line: 16, character: 20 },
                { path: path4, line: 10, character: 18 },
                { path: path5, line: 10, character: 25 },
            ]
            positions.forEach(pos => {
                it("Should find all references to extendState in " + pos.path + " at " + JSON.stringify(pos), function () {
                    const exp1 = { uri: vscodePath3, range: createRange(13, 16, 13, 27) };
                    const exp2 = { uri: vscodePath3, range: createRange(16, 17, 16, 28) };
                    const exp3 = { uri: vscodePath4, range: createRange(10, 16, 10, 27) };
                    const exp4 = { uri: vscodePath5, range: createRange(10, 20, 10, 31) };
                    let refs = getReferences(pos.path, pos);
                    expect(refs.length).to.equal(4);
                    expect(refs).to.deep.include(exp1);
                    expect(refs).to.deep.include(exp2);
                    expect(refs).to.deep.include(exp3);
                    expect(refs).to.deep.include(exp4);
                })
            })
        })
    })
});
