import { NarrativeStatus, Observation, Patient, PatientAdministrativeGender, Questionnaire, QuestionnaireResponse, Reference } from '@i4mi/fhir_r4';
import { IAnswerOption } from '../dist/IQuestion';
import { QuestionnaireData } from '../dist/QuestionnaireData';

const VARIOUS = require('./questionnaires/variousTypes.json') as Questionnaire;
const POPULATE = require('./questionnaires/populate.json') as Questionnaire;
const EMPTY_QUESTIONNAIRE = require('./questionnaires/empty.json') as Questionnaire;
const DEPENDING = require('./questionnaires/depending.json') as Questionnaire;
const CALCULATED = require('./questionnaires/calculatedExpression.json') as Questionnaire;
const NESTED = require('./questionnaires/nested.json') as Questionnaire;
const RESPONSE = require('./questionnaires/variousResponse.json') as QuestionnaireResponse;
const EMPTY_RESPONSE = require('./questionnaires/variousResponseEmpty.json') as QuestionnaireResponse;
const PATIENT = require('./questionnaires/patient.json') as Patient;
const OBSERVATION = require('./questionnaires/observation.json') as Observation;

const LANG = ['en'];

test('isResponseComplete()', () => {
    const testData = new QuestionnaireData(VARIOUS, LANG);
    const empty = new QuestionnaireData({url: 'none', ... EMPTY_QUESTIONNAIRE}, LANG);
    expect(testData.isResponseComplete()).toBeFalsy();
    expect(testData.isResponseComplete(true)).toBeFalsy();
    expect(testData.isResponseComplete(false)).toBeFalsy();
    expect(empty.isResponseComplete()).toBeTruthy();
    expect(empty.isResponseComplete(true)).toBeTruthy();
    expect(empty.isResponseComplete(false)).toBeTruthy();
});

test('isTouched()', () => {
    const testData = new QuestionnaireData(VARIOUS, LANG);
    const empty = new QuestionnaireData({url: 'none', ... EMPTY_QUESTIONNAIRE}, LANG);
    const q1 = testData.findQuestionById('1.1.1-string');
    expect(testData.isTouched()).toBeFalsy();
    expect(empty.isTouched()).toBeFalsy();
    expect(() => {testData.updateQuestionAnswers(q1!, {code: {valueString: 'Tom Cruise'}, answer: {[LANG[0]]: 'Tom Cruise'}})}).not.toThrow();
    expect(testData.isTouched()).toBeTruthy();
});

test('mark questions invalid', () => {
    const testData = new QuestionnaireData(VARIOUS, LANG);
    const group1 = testData.findQuestionById('1-group');
    const q1 = testData.findQuestionById('1.1.1-string');
    const q2 = testData.findQuestionById('1.1.2-choice');
    const q3 = testData.findQuestionById('1.2.1-decimal'); // second subgroup
    const q4 = testData.findQuestionById('2-multiple-choice'); // not required question
    expect(group1).toBeDefined();
    expect(q1).toBeDefined();
    expect(q2).toBeDefined();
    expect(q3).toBeDefined();
    expect(q4).toBeDefined();
    expect(() => {testData.updateQuestionAnswers(q1!, {code: {valueString: 'Tom Cruise'}, answer: {[LANG[0]]: 'Tom Cruise'}})}).not.toThrow();
    expect(q1?.isInvalid).toBeFalsy();
    expect(testData.isQuestionComplete(group1!)).toBeFalsy();
    expect(q2?.isInvalid).toBeTruthy();
    expect(q3?.isInvalid).toBeTruthy();
    expect(testData.isQuestionComplete(q3!)).toBeFalsy();
    expect(q3?.isInvalid).toBeTruthy();
    expect(q4?.isInvalid).toBeFalsy();
});

test('restoreAnswersFromQuestionnaireResponse', () => {
    const testData = new QuestionnaireData(VARIOUS, LANG);
    const empty = new QuestionnaireData({url: 'none', ... EMPTY_QUESTIONNAIRE}, LANG);
    // response not fitting questionnaire
    expect(() => empty.restoreAnswersFromQuestionnaireResponse(RESPONSE)).toThrow();
    expect(empty.getQuestionnaireResponse(LANG[0])).toBeDefined();
    expect(empty.isTouched()).toBeFalsy();

    // fitting response
    expect(() => testData.restoreAnswersFromQuestionnaireResponse(RESPONSE)).not.toThrow();

    // now we have all required questions answered, but not the non required
    expect(testData.isTouched()).toBeTruthy();
    expect(testData.isResponseComplete()).toBeFalsy();
    expect(testData.isResponseComplete(true)).toBeTruthy();

    // re-restore
    const emptyResponse: QuestionnaireResponse = { ... EMPTY_RESPONSE};
    expect(() => testData.restoreAnswersFromQuestionnaireResponse(emptyResponse)).not.toThrow();
    expect(testData.isResponseComplete(true)).toBeFalsy();
});

test('getQuestionnaireResponse', () => {
    const testData = new QuestionnaireData(VARIOUS, LANG);
    const newResponse = {...RESPONSE, authored: new Date().toISOString(),};
    testData.restoreAnswersFromQuestionnaireResponse(newResponse);
    expect(testData.getQuestionnaireResponse(LANG[0])).toBeDefined();
    //unsupported language
    expect(() => testData.getQuestionnaireResponse('it')).toThrow();
    // empty options object
    expect(testData.getQuestionnaireResponse(LANG[0], {})).toBeDefined();
    // date option
    expect(testData.getQuestionnaireResponse(LANG[0]).authored).toContain(new Date().toISOString().split('.')[0]); // ignore milliseconds for tolerance
    expect(testData.getQuestionnaireResponse(LANG[0], {}).authored).toContain(new Date().toISOString().split('.')[0]); // ignore milliseconds for tolerance
    expect(testData.getQuestionnaireResponse(LANG[0], {date: new Date('2022-10-10')}).authored).toContain('2022-10-10');
    // include id option
    expect(testData.getQuestionnaireResponse(LANG[0], {includeID: true}).id).toBe(newResponse.id);
    expect(testData.getQuestionnaireResponse(LANG[0], {includeID: false}).id).toBeUndefined();
    expect(testData.getQuestionnaireResponse(LANG[0]).id).toBeUndefined();
    expect(testData.getQuestionnaireResponse(LANG[0], {}).id).toBeUndefined();
    // when initial response had no id, the includeID option should not work
    const responseWithoutID = {... newResponse, id: undefined};
    const noIDData = new QuestionnaireData(VARIOUS, LANG);
    noIDData.restoreAnswersFromQuestionnaireResponse(responseWithoutID);
    expect(noIDData.getQuestionnaireResponse(LANG[0], {includeID: true}).id).toBeUndefined();
    // patient option
    const reference: Reference = {reference: 'Patient/123', type: 'Patient'};
    expect(testData.getQuestionnaireResponse(LANG[0]).source).toBeUndefined();
    expect(testData.getQuestionnaireResponse(LANG[0], {}).source).toBeUndefined();
    expect(testData.getQuestionnaireResponse(LANG[0], {patient: reference}).source).toEqual(reference);
    testData.getQuestionnaireResponse(LANG[0], {reset: true});
    expect(testData.isResponseComplete(true)).toBeFalsy();
});

test('resetResponse()', () => {
    const testData = new QuestionnaireData(VARIOUS, LANG);
    testData.restoreAnswersFromQuestionnaireResponse(RESPONSE);
    expect(testData.isResponseComplete(true)).toBeTruthy();
    testData.resetResponse();
    expect(testData.isResponseComplete(true)).toBeFalsy();
    expect(testData.isTouched()).toBeFalsy();
    expect(() => testData.getQuestionnaireResponse(LANG[0])).toThrow();
});

test('populateAnswers', () => {
    const testData = new QuestionnaireData(POPULATE, LANG);
    expect(() => testData.populateAnswers([PATIENT])).not.toThrow();
    expect(testData.isResponseComplete(true)).toBeTruthy();
    expect(testData.isTouched()).toBeTruthy();
    expect(testData.isResponseComplete(false)).toBeFalsy();
    expect(() => testData.populateAnswers([OBSERVATION])).not.toThrow();
    expect(testData.isResponseComplete(false)).toBeTruthy();

    testData.resetResponse();
    // populate also not required questions, with multiple resources
    expect(() => testData.populateAnswers([PATIENT, OBSERVATION])).not.toThrow();
    expect(testData.isResponseComplete(true)).toBeTruthy();
    expect(testData.isResponseComplete(false)).toBeTruthy(); // now all question should be answered;

    testData.resetResponse();
    // populate also not required questions, with multiple resources
    expect(() => testData.populateAnswers([PATIENT, OBSERVATION])).not.toThrow();
    expect(testData.isResponseComplete(true)).toBeTruthy();
    expect(testData.isResponseComplete(false)).toBeTruthy(); // now all question should be answered;

    const otherPatient: Patient = {
        resourceType: 'Patient',
        name: [
            {
                family: 'Lewinski',
                given: [
                    'Monica'
                ]
            }
        ],
        birthDate: '1973-07-23',
        gender: PatientAdministrativeGender.FEMALE
    };
    // do not overwrite existing answers
    expect(() => testData.populateAnswers([otherPatient])).not.toThrow(); 
    const nameQuestion = testData.findQuestionById('1');

    expect(nameQuestion).toBeDefined();
    expect(nameQuestion?.selectedAnswers.length).toBe(1);
    expect(nameQuestion?.selectedAnswers.findIndex(a => a.valueString === 'Peter Chalmers')).toBeGreaterThan(-1);
    expect(nameQuestion?.selectedAnswers.findIndex(a => a.valueString === 'Monica Lewinski')).toBe(-1);

    let birthdateQuestion = testData.findQuestionById('2');
    expect(birthdateQuestion).toBeDefined();
    expect(birthdateQuestion?.selectedAnswers.length).toBe(1);
    expect(birthdateQuestion?.selectedAnswers.findIndex(a => a.valueDate === PATIENT.birthDate)).toBeGreaterThan(-1);
    expect(birthdateQuestion?.selectedAnswers.findIndex(a => a.valueDate === otherPatient.birthDate)).toBe(-1);
   
    // DO overwrite existing answers
    expect(() => testData.populateAnswers([otherPatient], true)).not.toThrow(); 
    expect(nameQuestion?.selectedAnswers.length).toBe(1);
    // name is NOT overwritten, because otherPatient has no name with use=official
    expect(nameQuestion?.selectedAnswers.findIndex(a => a.valueString === 'Peter Chalmers')).toBeGreaterThan(-1);
    expect(nameQuestion?.selectedAnswers.findIndex(a => a.valueString === 'Monica Lewinski')).toBe(-1);
    // birthdate however IS overwritten
    expect(birthdateQuestion?.selectedAnswers.length).toBe(1);
    expect(birthdateQuestion?.selectedAnswers.findIndex(a => a.valueDate === PATIENT.birthDate)).toBe(-1);
    expect(birthdateQuestion?.selectedAnswers.findIndex(a => a.valueDate === otherPatient.birthDate)).toBeGreaterThan(-1);

    expect(() => testData.resetResponse()).not.toThrow();
    birthdateQuestion = testData.findQuestionById('2');
    expect(birthdateQuestion!.selectedAnswers[0]).toBeUndefined();
    expect(() => testData.populateAnswers([PATIENT], true)).not.toThrow(); 
    expect(birthdateQuestion!.selectedAnswers.length).toBe(1);
    expect(birthdateQuestion!.selectedAnswers[0].valueDate).toEqual(PATIENT.birthDate!);
});

test('answerQuestions', () => {
    const testData = new QuestionnaireData(VARIOUS, LANG);

    const q1 = testData.findQuestionById('1.1.1-string');
    expect(q1).toBeDefined();
    const a1: IAnswerOption = {
        answer: { en: 'Charly Brown' },
        code: {
            valueString: 'Charly Brown'
        }
    };
    expect(() => testData.updateQuestionAnswers(q1!, a1)).not.toThrow();
    
    const q2 = testData.findQuestionById('1.1.2-choice');
    expect(q2).toBeDefined();
    const a2 = q2!.answerOptions[1];
    expect(() => testData.updateQuestionAnswers(q2!, a2)).not.toThrow();

    const q3 = testData.findQuestionById('1.2.1-decimal');
    expect(q3).toBeDefined();
    const a3: IAnswerOption = {
        answer: { en: '3.5' },
        code: {
            valueDecimal: 3.5
        }
    };
    expect(() => testData.updateQuestionAnswers(q3!, a3)).not.toThrow();
    
    const q4 = testData.findQuestionById('1.2.2-integer');
    expect(q4).toBeDefined();
    const a4: IAnswerOption = {
        answer: { en: '51' },
        code: {
            valueInteger: 51
        }
    };
    expect(() => testData.updateQuestionAnswers(q4!, a4)).not.toThrow();
    
    const dependingGroup = testData.findQuestionById('1.2.3-dependingGroup');
    expect(dependingGroup).toBeDefined();
    // group depending on q5 being answered
    expect(dependingGroup!.isEnabled).toBeFalsy();

    const q5 = testData.findQuestionById('1.2.3-choice');
    expect(q5).toBeDefined();
    const a5 = q5!.answerOptions[0];
    expect(() => testData.updateQuestionAnswers(q5!, a5)).not.toThrow();
    
    // group depending on q5 being answered
    expect(dependingGroup!.isEnabled).toBeTruthy();
    expect(() => testData.updateQuestionAnswers(q5!, undefined)).not.toThrow();
    expect(dependingGroup!.isEnabled).toBeFalsy();
    expect(() => testData.updateQuestionAnswers(q5!, a5)).not.toThrow();

    const q6 = testData.findQuestionById('1.2.3.1-date');
    expect(q6).toBeDefined();
    const a6: IAnswerOption = {
        answer: { en: '10.10.2022' },
        code: {
            valueDate: '2022-10-10'
        }
    };
    expect(() => testData.updateQuestionAnswers(q6!, a6)).not.toThrow();
    
    const q7 = testData.findQuestionById('1.2.3.2-date');
    expect(q7).toBeDefined();
    expect(q7!.isInvalid).toBeFalsy(); // not answered, but we didn't check yet

    expect(testData.isResponseComplete(true, true)).toBeFalsy();
    expect(q6!.isInvalid).toBeFalsy();
    expect(q7!.isInvalid).toBeTruthy(); // not answered
    expect(testData.isQuestionComplete(q7!, false)).toBeFalsy();

    const a7: IAnswerOption = {
        answer: { en: '11.10.2022' },
        code: {
            valueDate: '2022-10-11'
        }
    };
    expect(() => testData.updateQuestionAnswers(q7!, a7)).not.toThrow();
    expect(q7!.isInvalid).toBeFalsy(); // now it is answered
    expect(testData.isQuestionComplete(q7!, false)).toBeTruthy();

    // the last question is not required, so the questionnaire is complete
    expect(testData.isResponseComplete(true)).toBeTruthy();


    // check if subsequent questions are false negatively invalid
    // unset q1 answer
    expect(() => testData.updateQuestionAnswers(q1!, undefined)).not.toThrow();
    expect(testData.isResponseComplete(true)).toBeFalsy();
    expect(q1?.isInvalid).toBeTruthy();
    expect(q7!.isInvalid).toBeFalsy();

    // set q1 answer again
    expect(() => testData.updateQuestionAnswers(q1!, a1)).not.toThrow();


    const q8 = testData.findQuestionById('1.2.4-boolean');
    expect(q8).toBeDefined();
    const a8: IAnswerOption = {
        answer: { en: 'true' },
        code: {
            valueBoolean: true
        }
    };
    expect(() => testData.updateQuestionAnswers(q8!, a8)).not.toThrow();

    // now the depending question is active, and since it is required, 
    // the questionnaire is not complete anymore
    expect(testData.isResponseComplete(true)).toBeFalsy();

    const q9 = testData.findQuestionById('1.2.4.1-dependingDate');
    expect(q9).toBeDefined();

    expect(testData.isResponseComplete(true)).toBeFalsy();

    const a9: IAnswerOption = {
        answer: {}, // intentionally leave out answer
        code: {
            valueDate: '2022-10-20'
        }
    };
    expect(() => testData.updateQuestionAnswers(q9!, a9)).not.toThrow();
    expect(q9?.selectedAnswers[0]).toBeDefined();
    expect(testData.isResponseComplete(true)).toBeTruthy();
});

test('dependingQuestions', () => {
    const testData = new QuestionnaireData(DEPENDING, LANG);
    const dependantQuestion = testData.findQuestionById('dependant-boolean');
    expect(dependantQuestion).toBeDefined();

    expect(testData.findQuestionById('active-when-undefined')?.isEnabled).toBeTruthy();
    expect(testData.findQuestionById('active-when-defined')?.isEnabled).toBeFalsy();

    const answerFalse: IAnswerOption = {
        answer: {en: 'false'},
        code: {
            valueBoolean: false
        }
    };
    expect(() => testData.updateQuestionAnswers(dependantQuestion!, answerFalse)).not.toThrow();
    expect(testData.findQuestionById('active-when-undefined')?.isEnabled).toBeFalsy();
    expect(testData.findQuestionById('active-when-defined')?.isEnabled).toBeTruthy();
    expect(testData.findQuestionById('active-when-false1')?.isEnabled).toBeTruthy();
    expect(testData.findQuestionById('active-when-false2')?.isEnabled).toBeTruthy();
    expect(testData.findQuestionById('active-when-true1')?.isEnabled).toBeFalsy();
    expect(testData.findQuestionById('active-when-true2')?.isEnabled).toBeFalsy();

    const answerTrue: IAnswerOption = {
        answer: {en: 'true'},
        code: {
            valueBoolean: true
        }
    };
    expect(() => testData.updateQuestionAnswers(dependantQuestion!, answerTrue)).not.toThrow();
    expect(testData.findQuestionById('active-when-undefined')?.isEnabled).toBeFalsy();
    expect(testData.findQuestionById('active-when-defined')?.isEnabled).toBeTruthy();
    expect(testData.findQuestionById('active-when-false1')?.isEnabled).toBeFalsy();
    expect(testData.findQuestionById('active-when-false2')?.isEnabled).toBeFalsy();
    expect(testData.findQuestionById('active-when-true1')?.isEnabled).toBeTruthy();
    expect(testData.findQuestionById('active-when-true2')?.isEnabled).toBeTruthy();

    const dependantGroupQuestion = testData.findQuestionById('dependant-with-group');
    expect(dependantGroupQuestion).toBeDefined();

    const groupAnswerNo: IAnswerOption = {
        answer: {en: 'no'},
        code: {
            valueString: 'no'
        }
    };
    expect(() => testData.updateQuestionAnswers(dependantGroupQuestion!, groupAnswerNo)).not.toThrow();

    const groupItem = testData.findQuestionById('depending-group');
    expect(groupItem).toBeDefined();
    expect(groupItem?.isEnabled).toBeFalsy() // the dependant question is not fulfilling the criteria

    const subItem = testData.findQuestionById('depending-group-subitem');
    expect(subItem).toBeDefined();
    expect(subItem?.selectedAnswers.length).toBe(0); // not answered yet
    expect(subItem?.isEnabled).toBeFalsy(); // as for specification: when the parent item is disabled, 
                                           // child items are disabled as well, no matter their own possible enableWhen
                                         
    expect(testData.isResponseComplete(true)).toBeTruthy(); // only required item is in an inactive group

    const response = testData.getQuestionnaireResponse(LANG[0]);
    expect(response).toBeDefined();

    // the response should not contain the not enabled items
    expect(response.item?.find(i => i.linkId === 'active-when-false1')).toBeUndefined();
    expect(response.item?.find(i => i.linkId === 'active-when-true1')).toBeDefined();

    const conflictingSubItem = testData.findQuestionById('depending-group-subitem-conflicting');
    expect(conflictingSubItem).toBeDefined();
    expect(conflictingSubItem?.isEnabled).toBeFalsy();   // as for specification: when the parent item is disabled, 
                                                        // child items are disabled as well, no matter their own possible enableWhen

    const othersubItem = testData.findQuestionById('depending-group-subitem-conflicting');
    expect(othersubItem).toBeDefined();
    expect(othersubItem?.isEnabled).toBeFalsy();        // as for specification: when the parent item is disabled, 
                                                        // child items are disabled as well, no matter their own possible enableWhen
    const groupAnswerYes: IAnswerOption = {
        answer: {en: 'yes'},
        code: {
            valueString: 'yes'
        }
    };
    expect(() => testData.updateQuestionAnswers(dependantGroupQuestion!, groupAnswerYes)).not.toThrow();
    expect(subItem?.isEnabled).toBeTruthy();
    expect(testData.isResponseComplete(true)).toBeFalsy();
    expect(conflictingSubItem?.isEnabled).toBeFalsy();  // when enabling, the items own rules override the rules of the parent 
    expect(othersubItem?.isEnabled).toBeFalsy();        // when enabling, the items own rules override the rules of the parent 
});

test('multiple choice / unselectOthersExtension', () => {
    const testData = new QuestionnaireData(VARIOUS, LANG);
    const mcQuestion = testData.findQuestionById('2-multiple-choice');
    expect(mcQuestion).toBeDefined();

    const tomato = mcQuestion?.answerOptions.find(option => option.answer.en == 'Tomato');
    expect(tomato).toBeDefined();
    const mozzarella = mcQuestion?.answerOptions.find(option => option.answer.en == 'Mozzarella cheese');
    expect (mozzarella).toBeDefined();
    const salami = mcQuestion?.answerOptions.find(option => option.answer.en == 'Salami');
    expect (salami).toBeDefined();
    const nothing = mcQuestion?.answerOptions.find(option => option.answer.en == 'nothing');
    expect (nothing).toBeDefined();

    // add first option
    expect(() => testData.updateQuestionAnswers(mcQuestion!, tomato)).not.toThrow();
    // add second option
    expect(() => testData.updateQuestionAnswers(mcQuestion!, mozzarella)).not.toThrow();
    // and third option 
    expect(() => testData.updateQuestionAnswers(mcQuestion!, salami)).not.toThrow();
    // now we should have three answers selected
    expect(mcQuestion!.selectedAnswers.length).toBe(3);
    // actually, we don't want salami
    expect(() => testData.updateQuestionAnswers(mcQuestion!, salami)).not.toThrow();
    // now we should only two answers selected
    expect(mcQuestion!.selectedAnswers.length).toBe(2);
    expect(testData.isAnswerOptionSelected(mcQuestion!, salami!)).toBeFalsy();
    expect(testData.isAnswerOptionSelected(mcQuestion!, mozzarella!)).toBeTruthy();

    // check the option with the unselect-others-flag
    expect(() => testData.updateQuestionAnswers(mcQuestion!, nothing)).not.toThrow();
    expect(mcQuestion!.selectedAnswers.length).toBe(1);
    expect(testData.isAnswerOptionSelected(mcQuestion!, mozzarella!)).toBeFalsy();
    expect(testData.isAnswerOptionSelected(mcQuestion!, nothing!)).toBeTruthy();

    // it should also work the other way around
    expect(() => testData.updateQuestionAnswers(mcQuestion!, tomato)).not.toThrow();
    expect(mcQuestion!.selectedAnswers.length).toBe(1);
    expect(testData.isAnswerOptionSelected(mcQuestion!, nothing!)).toBeFalsy();
    expect(testData.isAnswerOptionSelected(mcQuestion!, tomato!)).toBeTruthy();
    const tomatoOnlyCode: IAnswerOption = {
        answer: {},
        code: {
            valueCoding: {
            system: 'http://snomed.info/sct',
            display: 'Tomato',
            code: '734881000'
        }}
    };
    expect(testData.isAnswerOptionSelected(mcQuestion!, tomatoOnlyCode)).toBeTruthy();
});

test('calculated expression', () => {
    const testData = new QuestionnaireData(CALCULATED, LANG);

    const hidden = testData.findQuestionById('score-choice');
    expect(hidden).toBeUndefined(); // hidden items should not show up in questions

    const q1 = testData.findQuestionById('q1');
    expect(q1).toBeDefined();
    const a1: IAnswerOption = {
        answer: {},
        code: {
            valueCoding: {
                code: '12'
            }
        }
    };
    const q2 = testData.findQuestionById('q2');
    expect(q2).toBeDefined();
    expect(() => testData.updateQuestionAnswers(q1!, a1)).not.toThrow();
    expect(() => testData.updateQuestionAnswers(q2!, a1)).not.toThrow();


    const q3 = testData.findQuestionById('q3');
    expect(q3).toBeDefined();
    expect(() => testData.updateQuestionAnswers(
        q3!, {answer: {}, code: {valueInteger: 2}}
    )).not.toThrow();
    const q4 = testData.findQuestionById('q4');
    expect(q4).toBeDefined();
    expect(() => testData.updateQuestionAnswers(
        q4!, {answer: {}, code: {valueInteger: 3}}
    )).not.toThrow();
    const q5 = testData.findQuestionById('q5');
    expect(q5).toBeDefined();
    expect(() => testData.updateQuestionAnswers(
        q5!, {answer: {}, code: {valueInteger: 1}}
    )).not.toThrow();

    const response = testData.getQuestionnaireResponse(LANG[0]);
    expect(response).toBeDefined();

    const choiceScore = response.item?.find(i => i.linkId === 'score-choice');
    expect(choiceScore).toBeDefined();
    expect(choiceScore?.answer![0].valueInteger).toBe(2 * Number(a1.code.valueCoding?.code));

    const integerScore = response.item?.find(i => i.linkId === 'score-integer');
    expect(integerScore).toBeDefined();
    expect(integerScore?.answer![0].valueInteger).toBe(2 * 3 * 1);
});

test('narrative', () => {
    const testData = new QuestionnaireData(VARIOUS, LANG);
    expect(() => testData.restoreAnswersFromQuestionnaireResponse(RESPONSE)).not.toThrow();
    const mcQuestion = testData.findQuestionById('2-multiple-choice');
    expect(mcQuestion).toBeDefined;
    testData.updateQuestionAnswers(mcQuestion!, mcQuestion?.answerOptions[1]);
    testData.updateQuestionAnswers(mcQuestion!, mcQuestion?.answerOptions[2]);
    testData.updateQuestionAnswers(mcQuestion!, mcQuestion?.answerOptions[4]);
    const response = testData.getQuestionnaireResponse(LANG[0])
    const narrative = response.text;
    expect(narrative).toBeDefined();
    expect(narrative?.status).toEqual(NarrativeStatus.GENERATED);
    const div = narrative?.div || '';
    expect(div.length).toBeGreaterThan(0);
    expect(div.includes('http://i4mi.bfh.ch/various-types-questionnaire|1')).toBeTruthy();
    expect(div.includes('INTRAVENOUS')).toBeTruthy();
    expect(div.includes('Hep B given y / n')).toBeTruthy();
    expect(div.includes('Mozzarella cheese')).toBeTruthy();
    expect(div.includes('Tomato')).toBeTruthy();
});

test('nested questions', () => {
    const testData = new QuestionnaireData(NESTED, ['en']);
    const parentQuestion = testData.findQuestionById('Q1');
    const childQuestion = testData.findQuestionById('Q1a');
    const grandchildQuestion = testData.findQuestionById('Q1a1');
    expect(parentQuestion).toBeDefined();
    expect(childQuestion).toBeDefined();
    expect(grandchildQuestion).toBeDefined();
    
    testData.updateQuestionAnswers(parentQuestion!, {answer: {},code: {valueBoolean: true}});
    testData.updateQuestionAnswers(childQuestion!, {answer: {},code: {valueString: 'first subanswer'}});
    testData.updateQuestionAnswers(grandchildQuestion!, {answer: {},code: {valueString: 'second subanswer'}});

    const groupQuestions = [
        testData.findQuestionById('Q2a'),
        testData.findQuestionById('Q2b')
    ];
    expect(groupQuestions[0]).toBeDefined();
    expect(groupQuestions[1]).toBeDefined();
    groupQuestions.forEach((gq, i) => testData.updateQuestionAnswers(gq!, {answer: {},code: {valueString: 'group answer #' + (i+1)}}));

    expect(() => testData.getQuestionnaireResponse('en')).not.toThrow();
    const response = testData.getQuestionnaireResponse('en');
    expect(response).toBeDefined();
    expect(response.item?.length).toBe(2);
    const parentAnswer = response.item?.find(i => i.linkId === parentQuestion?.id);
    expect(parentAnswer).toBeDefined();
    expect(parentAnswer?.answer?.length).toBe(1); 
    expect(parentAnswer?.item).toBeUndefined(); // if there is answer present, we can't have subitems
    const childAnswer = parentAnswer?.answer ? parentAnswer.answer[0].item?.find((sa) => sa.linkId === childQuestion!.id) : undefined;
    expect(childAnswer).toBeDefined();
   expect(childAnswer?.answer?.length).toBe(1); 
    expect(childAnswer?.item).toBeUndefined(); // if there is answer present, we can't have subitems
    const grandchildAnswer = childAnswer?.answer ? childAnswer.answer[0].item?.find((sa) => sa.linkId === grandchildQuestion!.id) : undefined;
    expect(grandchildAnswer).toBeDefined();
    const answerGroup = response.item?.find(i => i.linkId === 'Q2');
    expect(answerGroup).toBeDefined();
    expect(answerGroup?.answer).toBeUndefined(); // group items don't have answers
    expect(answerGroup?.item?.length).toBe(2);
});
