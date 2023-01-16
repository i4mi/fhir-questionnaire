import { Observation, Patient, Questionnaire, QuestionnaireResponse, Reference } from '@i4mi/fhir_r4';
import { IAnswerOption } from '../dist/IQuestion';
import { QuestionnaireData } from '../dist/QuestionnaireData';

const VARIOUS = require('./questionnaires/variousTypes.json') as Questionnaire;
const POPULATE = require('./questionnaires/populate.json') as Questionnaire;
const EMPTY_QUESTIONNAIRE = require('./questionnaires/empty.json') as Questionnaire;
const RESPONSE = require('./questionnaires/variousResponse.json') as QuestionnaireResponse;
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

test('restoreAnswersFromQuestionnaireResponse', () => {
    const testData = new QuestionnaireData(VARIOUS, LANG);
    const empty = new QuestionnaireData({url: 'none', ... EMPTY_QUESTIONNAIRE}, LANG);
    // response not fitting questionnaire
    expect(() => empty.restoreAnswersFromQuestionnaireResponse(RESPONSE)).toThrow();
    expect(empty.getQuestionnaireResponse(LANG[0])).toBeDefined();

    // fitting response
    expect(() => testData.restoreAnswersFromQuestionnaireResponse(RESPONSE)).not.toThrow();

    // now we have all required questions answered, but not the non required
    expect(testData.isResponseComplete()).toBeFalsy();
    expect(testData.isResponseComplete(true)).toBeTruthy();

    // re-restore
    const emptyResponse: QuestionnaireResponse = { ... RESPONSE, item: [], authored: new Date().toISOString()};
    // do not overwrite when response has no items
    expect(() => testData.restoreAnswersFromQuestionnaireResponse(emptyResponse)).not.toThrow();
    expect(testData.isResponseComplete(true)).toBeTruthy();
    // add one item so answers are overridden
    emptyResponse.item = [
        {...RESPONSE.item![0]},
        {...RESPONSE.item![1], answer: undefined}
    ];
    emptyResponse.authored = new Date().toISOString();
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
    expect(() => testData.getQuestionnaireResponse(LANG[0])).toThrow();
});

test('populateAnswers', () => {
    const testData = new QuestionnaireData(POPULATE, LANG);
    expect(() => testData.populateAnswers([PATIENT])).not.toThrow();
    expect(testData.isResponseComplete(true)).toBeTruthy();
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

    expect(testData.isResponseComplete(true)).toBeFalsy();

    const q7 = testData.findQuestionById('1.2.3.2-date');
    expect(q7).toBeDefined();
    const a7: IAnswerOption = {
        answer: { en: '11.10.2022' },
        code: {
            valueDate: '2022-10-11'
        }
    };
    expect(() => testData.updateQuestionAnswers(q7!, a7)).not.toThrow();

    // the last question is not required, so the questionnaire is complete
    expect(testData.isResponseComplete(true)).toBeTruthy();

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


// also test calculated expressions
// also test isValid()