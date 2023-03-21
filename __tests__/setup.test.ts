import { Questionnaire, QuestionnairePublicationStatus } from '@i4mi/fhir_r4';
import { QuestionnaireData } from '../dist/QuestionnaireData';

const VARIOUS = require('./questionnaires/variousTypes.json') as Questionnaire;
const EMPTY_QUESTIONNAIRE = require('./questionnaires/empty.json') as Questionnaire;
const INITIAL = require('./questionnaires/initialValues.json') as Questionnaire;

const LANG = ['en'];
const testData = new QuestionnaireData(VARIOUS, LANG);
const emptyData = new QuestionnaireData(EMPTY_QUESTIONNAIRE, LANG);

// TODO: test with external valuesets
// TODO: test hidden items


test('getQuestions()', () => {
    expect(testData.getQuestions().length).toBe(VARIOUS.item?.length);
});

test('serialize() / unserialize()', () => {
    const serialized = testData.serialize();
    expect(typeof serialized).toBe('string');

    // rehydrate manually
    const unserialized  = JSON.parse(serialized);
    const rehydrated = new QuestionnaireData(VARIOUS, LANG, unserialized.valueSets, unserialized.items, unserialized.hiddenFhirItems);
    expect(rehydrated).toEqual(testData);

    // rehydrate with method
    const rehydrated2 = new QuestionnaireData(VARIOUS, LANG);
    rehydrated2.unserialize(serialized);
    expect(rehydrated2).toEqual(testData);

    // rehydrate with whole stringified object
    const rehydrated3 = new QuestionnaireData(VARIOUS, LANG);
    rehydrated3.unserialize(JSON.stringify(testData));
    expect(rehydrated3).toEqual(testData);
});

test('getQuestionnaireTitle()', () => {
    expect(testData.getQuestionnaireTitle(LANG[0])).toBe(VARIOUS.title);
    expect(emptyData.getQuestionnaireTitle(LANG[0])).toBeUndefined();
});

test('getQuestionnaireDescription', () => {
    expect(testData.getQuestionnaireDescription(LANG[0])).toBe(VARIOUS.description);
    expect(emptyData.getQuestionnaireDescription(LANG[0])).toBeUndefined();
});

test('getQuestionnaireURLwitVersion()', () => {
    const noVersion = new QuestionnaireData({
        resourceType: 'Questionnaire',
        status: QuestionnairePublicationStatus.ACTIVE,
        url: 'http://test.com'
    }, LANG);
    const noUrl = new QuestionnaireData({
        resourceType: 'Questionnaire',
        status: QuestionnairePublicationStatus.ACTIVE,
        version: '1.0'
    }, LANG);

    expect(testData.getQuestionnaireURLwithVersion()).toEqual(VARIOUS.url  + '|' + VARIOUS.version);
    expect(emptyData.getQuestionnaireURLwithVersion()).toEqual('');
    expect(noVersion.getQuestionnaireURLwithVersion()).toEqual('http://test.com');
    expect(noUrl.getQuestionnaireURLwithVersion()).toEqual('');
});

test('findQuestionById()', () => {
    // top level
    expect(testData.findQuestionById('1-group')).toBeDefined();
    // sub level
    expect(testData.findQuestionById('1.2.4-boolean')).toBeDefined();
    // not found
    expect(testData.findQuestionById('noValidID')).toBeUndefined();
    // no data
    expect(emptyData.findQuestionById('1-group')).toBeUndefined();
    // explicitly provide data
    expect(testData.findQuestionById('1-group', testData.getQuestions())).toBeDefined();
    // explicitly provide empty data
    expect(testData.findQuestionById('1-group', [])).toBeUndefined();
});

test('initial values', () => {
    const initialTest = new QuestionnaireData(INITIAL, LANG); 
    let q1 = initialTest.findQuestionById('1');
    expect(q1).toBeDefined();
    expect(q1?.selectedAnswers[0].valueBoolean).toEqual(true);
    const q21 = initialTest.findQuestionById('2.1');
    expect(q21).toBeDefined();
    // wrong format, so not initially selected
    expect(q21?.selectedAnswers[0]).toBeUndefined();
    let q22 = initialTest.findQuestionById('2.2');
    expect(q22).toBeDefined();
    expect(q22?.selectedAnswers[0].valueDate).toEqual('1941-01-05');
    const q23 = initialTest.findQuestionById('2.3');
    expect(q23).toBeDefined();
    expect(q23?.selectedAnswers[0].valueString).toEqual('Kiribati');
    const q24 = initialTest.findQuestionById('2.4');
    expect(q24).toBeDefined();
    expect(q24?.selectedAnswers[0].valueString).toEqual('single');
    const q31 = initialTest.findQuestionById('3.1');
    expect(q31).toBeDefined();
    // wrong format, so not initially selected
    expect(q31?.selectedAnswers[0]).toBeUndefined();
    const q32 = initialTest.findQuestionById('3.2');
    expect(q32).toBeDefined();
    expect(q32?.selectedAnswers[0].valueBoolean).toEqual(true);

    // set new answers
    expect(() => {initialTest.updateQuestionAnswers(q1!, {code: {valueBoolean: false}, answer: {en: 'no'}})}).not.toThrow();
    expect(() => {initialTest.updateQuestionAnswers(q22!, {code: {valueDate: '2010-01-01'}, answer: {en: '2010-01-01'}})}).not.toThrow()

    expect(q1?.selectedAnswers[0].valueBoolean).not.toEqual(true);
    expect(q22?.selectedAnswers[0].valueDate).not.toEqual('1941-01-05');

    // after reset, we expect the questions to have the initial values again
    expect(() => {initialTest.resetResponse()}).not.toThrow();
    expect(initialTest.findQuestionById('1')!.selectedAnswers[0].valueBoolean).toEqual(true);
    expect(initialTest.findQuestionById('2.2')!.selectedAnswers[0].valueDate).toEqual('1941-01-05');
});