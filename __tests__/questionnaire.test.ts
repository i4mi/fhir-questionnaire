import { Questionnaire, QuestionnairePublicationStatus, QuestionnaireResponseStatus } from '@i4mi/fhir_r4';
import { QuestionnaireData } from '../dist/QuestionnaireData';

const BLUEBOOK = require('../demo/src/assets/questionnaires/bluebook.json') as Questionnaire;
const ZARIT = require('../demo/src/assets/questionnaires/zarit.json') as Questionnaire;
const EMPTY_QUESTIONNAIRE = {resourceType: 'Questionnaire', status: QuestionnairePublicationStatus.ACTIVE}


test('setup', () => {
    const LANG = ['en'];
    const testData = new QuestionnaireData(BLUEBOOK, LANG);
    const emptyData = new QuestionnaireData(EMPTY_QUESTIONNAIRE, LANG);

    // TODO: test with external valuesets

    expect(testData.getQuestions().length).toBe(BLUEBOOK.item?.length);

    const serialized = testData.serialize();
    expect(typeof serialized).toBe('string');

    // rehydrate manually
    const unserialized  = JSON.parse(serialized);
    const rehydrated = new QuestionnaireData(BLUEBOOK, LANG, unserialized.valueSets, unserialized.items, unserialized.hiddenFhirItems);
    expect(rehydrated).toEqual(testData);

    // rehydrate with method
    const rehydrated2 = new QuestionnaireData(BLUEBOOK, LANG);
    rehydrated2.unserialize(serialized);
    expect(rehydrated2).toEqual(testData);

    // rehydrate with whole stringified object
    const rehydrated3 = new QuestionnaireData(BLUEBOOK, LANG);
    rehydrated3.unserialize(JSON.stringify(testData));
    expect(rehydrated3).toEqual(testData);

    expect(testData.getQuestionnaireTitle(LANG[0])).toBe(BLUEBOOK.title);
    expect(emptyData.getQuestionnaireTitle(LANG[0])).toBeUndefined();

    expect(testData.getQuestionnaireURLwithVersion()).toEqual(BLUEBOOK.url);
    expect(emptyData.getQuestionnaireURLwithVersion()).toEqual('');
    
    const URL = 'http://test.com';
    const VERSION = '1.0.1';
    const canonicalURLData = new QuestionnaireData({
        resourceType: 'Questionnaire',
        status: QuestionnairePublicationStatus.ACTIVE,
        url: URL,
        version: VERSION
    }, LANG);
    expect(canonicalURLData.getQuestionnaireURLwithVersion()).toEqual(URL + '|' + VERSION);

});

test('i18n', () => {
    const LANGUAGES = ['de', 'fr', 'it']; // 'it' is not in Questionnaire

    const testData = new QuestionnaireData(ZARIT, LANGUAGES);
    
    expect(testData.availableLanguages).toEqual(LANGUAGES);
    expect(testData.getQuestionnaireTitle('fr')).toEqual('Echelle de Zarit ou inventaire du fardeau');
    // test fallback for language that is not in questionnaire
    expect(testData.getQuestionnaireTitle('it')).toEqual('Fragen zur Belastung, Aufwand, Soziodemographie (Version III)');
    expect(testData.getQuestionnaireTitle('')).toEqual('Fragen zur Belastung, Aufwand, Soziodemographie (Version III)');

});

test('dependingQuestions', () => {

});

// resetResponse()

//  updateQuestionAnswers(_question: IQuestion, _answer: IAnswerOption | undefined): void {

// isAnswerOptionSelected(_question: IQuestion, _answer: IAnswerOption): boolean {

// restoreAnswersFromQuestionnaireResponse(_fhirResponse: QuestionnaireResponse): void {

//     getQuestionnaireResponse()

// isResponseComplete(_onlyRequired?: boolean): boolean {

//  populateAnswers(_resources: Resource[], _overWriteExistingAnswers?: boolean): void {

//  findQuestionById(_id: string, _data: IQuestion[]): IQuestion | undefined {

// also test depending questions