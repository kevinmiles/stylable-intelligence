import StylableDotCompletionProvider, { Completion, snippet, ExtendedResolver } from '../src/provider'
import { Resolver, Stylesheet } from 'stylable'
import * as _ from 'lodash';
import { expect } from "chai";
import { TestResolver } from '../test-kit/test-resolver';
import * as asserters from '../test-kit/asserters'

describe('completion unit test', function () {
    describe('root level', function () {
        it('should complete ONLY import directive, root and existing classes at top level', function () {
            return asserters.getCompletions('general/top-level-existing-classes.css').then((asserter) => {
                asserter.suggested(
                    [
                        asserters.importCompletion,
                        asserters.rootCompletion,
                        asserters.classCompletion('gaga')
                    ]
                );
                asserter.notSuggested([
                    asserters.statesDirectiveCompletion,
                    asserters.extendsDirectiveCompletion,
                    asserters.mixinDirectiveCompletion,
                    asserters.variantDirectiveCompletion
                ]);
            });
        });

        it('should complete root and existing classes at top level after "."', function () {
            return asserters.getCompletions('general/top-level-dot.css').then((asserter) => {
                asserter.suggested([
                    asserters.rootCompletion,
                    asserters.classCompletion('gaga')
                ]);
                asserter.notSuggested([
                    asserters.importCompletion,
                    asserters.statesDirectiveCompletion,
                    asserters.extendsDirectiveCompletion,
                    asserters.mixinDirectiveCompletion,
                    asserters.variantDirectiveCompletion
                ])
            });
        });

    });

    describe('directives', function () {
        it('should complete -st-states, -st-extends, -st-mixin, -st-variant inside simple selector', function () {
            return asserters.getCompletions('imports/inside-simple-selector.css').then((asserter) => {

                asserter.suggested([
                    asserters.statesDirectiveCompletion,
                    asserters.extendsDirectiveCompletion,
                    asserters.mixinDirectiveCompletion,
                    asserters.variantDirectiveCompletion
                ]);

            });
        });

        it('should complete -st-states, -st-extends, -st-mixin, -st-variant inside simple selector after dash', function () {
            return asserters.getCompletions('general/inside-simple-selector-dash.css')
                .then((asserter) => {
                    asserter.suggested([
                        asserters.statesDirectiveCompletion,
                        asserters.extendsDirectiveCompletion,
                        asserters.mixinDirectiveCompletion,
                        asserters.variantDirectiveCompletion
                    ]);

                });
        });

        it('should not complete -st-states, -st-extends, -st-mixin, -st-variant inside simple selector when they exist', function () {
            return asserters.getCompletions('general/inside-simple-selector-with-all-st-fields.css').then((asserter) => {
                asserter.notSuggested([
                    asserters.statesDirectiveCompletion,
                    asserters.extendsDirectiveCompletion,
                    asserters.mixinDirectiveCompletion,
                    asserters.variantDirectiveCompletion
                ]);

            });
        });

        //TODO: Split into small tests, or find way to do this with 1 file.
        xdescribe('should not complete -st-states, -st-extends, -st-variant inside complex rules', function () {
            [
                `
            .gaga:hover{
                |
            }
            `,
                `
            .gaga.baga{
                |
            }
            `,
                `
            .gaga div{
                |
            }
            `,
                `
            .gaga > div{
                |
            }
            `,
                `
            div.baga{
                |
            }
            `,
                `
            @media(max-width:200){
                div.baga{
                    |
                }
            }
            `
            ].map((src) => {

                it('complex rule ' + src.slice(0, src.indexOf('{')), function () {
                    return asserters.getCompletions(src, {}, true).then((asserter) => {
                        asserter.suggested([
                            asserters.mixinDirectiveCompletion
                        ])
                        asserter.notSuggested([
                            asserters.statesDirectiveCompletion,
                            asserters.extendsDirectiveCompletion,
                            asserters.variantDirectiveCompletion
                        ]);

                    });
                })
            });


        });
    });

    describe('states', function () {
        it('should complete available states after :', function () {
            return asserters.getCompletions('states/class-with-states.css').then((asserter) => {
                asserter.suggested([
                    asserters.stateCompletion('hello', 'states/class-with-states.css'),
                    asserters.stateCompletion('goodbye', 'states/class-with-states.css')
                ]);
                asserter.notSuggested([
                    asserters.importCompletion
                ]);
            });
        });

        xit('should not break for untyped classes', function () { //What is tested here?
            return asserters.getCompletions(
                `
            .gaga{
            }
            .gaga:|
            `, {}, true).then((asserter) => {

                    asserter.notSuggested([
                        asserters.importCompletion,
                        asserters.stateCompletion('hello')
                    ]);
                });
        });

        it('should complete available states after : in complex selectors', function () {
            return asserters.getCompletions('states/complex-selectors-with-states.css').then((asserter) => {
                asserter.suggested([
                    asserters.stateCompletion('hello', 'states/complex-selectors-with-states.css')
                ]);
                asserter.notSuggested([
                    asserters.importCompletion,
                    asserters.stateCompletion('goodbye', 'states/complex-selectors-with-states.css'),
                    asserters.stateCompletion('cheerio', 'states/complex-selectors-with-states.css')
                ]);
            });
        });

        it('should not complete available states after : in complex selectors if existing', function () {
            return asserters.getCompletions('states/complex-selectors-with-states-existing.css').then((asserter) => {
                asserter.notSuggested([
                    asserters.importCompletion,
                    asserters.stateCompletion('hello')

                ]);
            });
        });
    });

    describe('multiple files', function () {



        it('complete states for localy imported component', function () {
            return asserters.getCompletions('states/locally-imported-component.css')
                .then((asserter) => {
                    asserter.suggested([
                        asserters.stateCompletion('shmover', 'projectRoot/comp.css')
                    ]);
                });
        });

        it('complete states for localy imported component (including local states)', function () {
            return asserters.getCompletions(
                `
                :import{
                    -st-from: "./comp.css";
                    -st-default: Comp;

                }
                .gaga{
                    -st-extends: Comp;
                    -st-states: hello;
                }
                .gaga:|
                `,
                {
                    'comp.css': `
                            .root{
                                -st-states:shmover;
                            }
                        `
                }, true).then((asserter) => {
                    asserter.suggested([
                        asserters.stateCompletion('shmover', 'projectRoot/comp.css'),
                        asserters.stateCompletion('hello')
                    ]);
                });
        });


        it('complete states for localy imported component ( recursive )', function () {
            return asserters.getCompletions(
                `
                :import{
                    -st-from: "./comp2.css";
                    -st-default: Comp;
                }
                .gaga{
                    -st-extends: Comp;
                    -st-states: normalstate;
                }
                .gaga:|
                `,
                {
                    'comp1.css': `
                            .root{
                                -st-states:recursestate;
                            }
                    `,
                    'comp2.css': `
                        :import{
                            -st-from: "./comp1.css";
                            -st-default: Zag;
                        }
                        .root{
                            -st-extends:Zag;
                            -st-states:importedstate;
                        }
                    `
                }, true).then((asserter) => {
                    asserter.suggested([
                        asserters.stateCompletion('importedstate', 'projectRoot/comp2.css'),
                        asserters.stateCompletion('recursestate', 'projectRoot/comp1.css'),
                        asserters.stateCompletion('normalstate')
                    ]);
                });
        });
        xit('complete states for localy imported variant', function () {
            return asserters.getCompletions(
                `
                :import{
                    -st-from: "./comp.css";
                    -st-named: zagzag;

                }
                .gaga{
                    -st-extends: zagzag;
                }
                .gaga:|
                `,
                {
                    'comp.css': `
                            .root{
                                -st-states:shmover;
                            }
                            .zagzag{
                                -st-variant:true;
                            }
                        `
                }, true).then((asserter) => {
                    asserter.suggested([
                        asserters.stateCompletion('shmover', 'projectRoot/comp.css')
                    ]);
                });
        });


        it('should not break while typing', function () {
            return asserters.getCompletions(
                `
                .|
                .gaga{
                    -st-states:hello;
                }
                .gaga:hello{

                }
                `, {
                    'comp.css': ``
                }, false).then((asserter) => {
                    asserter.suggested([
                        asserters.classCompletion('gaga')
                    ]);
                });
        });

        it('should not complete when broken', function () {
            return asserters.getCompletions(
                `
                :import{
                    -st-from:"./comp.css";
                    -st-default:Comp;
                }
                .gaga{
                    -st-extends::| ;
                }
                `, {
                    'comp.css': ``
                }, true).then((asserter) => {
                    asserter.notSuggested([
                        asserters.extendsCompletion('Comp'),
                        asserters.importCompletion,
                        asserters.mixinDirectiveCompletion
                    ]);
                });
        });
    });
})
