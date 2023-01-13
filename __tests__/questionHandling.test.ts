import { Observation, Patient, Questionnaire, QuestionnaireResponse, Reference } from '@i4mi/fhir_r4';
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


// also test depending questions
// also test calculated expressions