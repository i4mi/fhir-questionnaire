import { Questionnaire, QuestionnaireResponse, ValueSet, Reference } from "@i4mi/fhir_r4";
import { IQuestion, IAnswerOption } from "./IQuestion";
export declare class QuestionnaireData {
    fhirQuestionnaire: Questionnaire;
    valueSets: {
        [url: string]: ValueSet;
    };
    items: IQuestion[];
    hiddenFhirItems: {
        item: IQuestion;
        parentLinkId?: string;
    }[];
    lastRestored: Date | undefined;
    availableLanguages: string[];
    responseIdToSynchronize: string | undefined;
    constructor(_questionnaire: Questionnaire, _availableLanguages?: string[], _valueSets?: {
        [url: string]: ValueSet;
    }, _items?: IQuestion[], _hiddenFhirItems?: {
        item: IQuestion;
        parentLinkId?: string;
    }[]);
    /**
    * Resets the response to the questionnaire
    **/
    resetResponse(): void;
    /**
    * Returns the questions array.
    **/
    getQuestions(): IQuestion[];
    /**
     * Updates the selected answer(s) of a question: adds the answer if it's not already selected
     * and removes it, if it was selected.
     * @param _question     the IQuestion to which the answer belongs
     * @param _answer       the selected / unselected QuestionnaireItemAnswerOption
     **/
    updateQuestionAnswers(_question: IQuestion, _answer: IAnswerOption | undefined): void;
    /**
    * Evaluates a given answer with a criterium and an operator, for enabling and disabling depending questions.
    * @param _answer        the given answer, as string (also for code etc) or as a number (when using GE, GT, LE & LT operator)
    * @param _criterium     the criterium against which the given answer is compared
    * @param _operator      defines if the answer and criterium must be equal or not equal etc.
    * @returns              true if answer and criterium match with the given operator, false if not so.
    **/
    private evaluateAnswersForDependingQuestion;
    /**
    * Checks if a given IAnswerOption is already selected for a IQuestion.
    * @param _question     the IQuestion to which the answer belongs
    * @param _answer       the IAnswerOption in question
    **/
    isAnswerOptionSelected(_question: IQuestion, _answer: IAnswerOption): boolean;
    /**
    * Returns the questionnaire title in a given language.
    * @param _language the language code of the wanted language
    **/
    getQuestionnaireTitle(_language: string): string | undefined;
    /**
    * Processes a QuestionnaireResponse and parses the given answers to the local iQuestion array
    * @param _fhirResponse a QuestionnaireResponse that matches the Questionnaire
    * @throws an error if the questionnaire response is not matching the questionnaire
    **/
    restoreAnswersFromQuestionnaireResponse(_fhirResponse: QuestionnaireResponse): void;
    /**
    * Gets the QuestionnaireResponse resource with all the currently set answers.
    * @param _language the shorthand for the language the QuestionnaireResponse should be in
    * @param _patient? a Reference to the FHIR Patient who filled out the Questionnaire
    * @param _date?    the date when the Questionnaire was filled out (current date by default)
    * @param _includeID include FHIR resource ID of a potential previously restored QuestionnaireResponse (default: false)
    * @returns         a QuestionnaireResponse FHIR resource containing all the answers the user gave
    * @throws          an error if the QuestionnaireResponse is not valid for the corresponding
    *                  Questionnaire, e.g. when a required answer is missing
    **/
    getQuestionnaireResponse(_language: string, _patient?: Reference, _date?: Date, _includeID?: boolean): QuestionnaireResponse;
    /**
    * Returns the questionnaire URL with version number in FHIR canonical format.
    * @return a canonical questionnaire URL
    **/
    getQuestionnaireURLwithVersion(): string;
    /**
    * Checks a QuestionnaireResponse for completeness.
    * @param   onlyRequired optional parameter, to specify if only questions with
    the required attribute need to be answered or all questions;
    default value is: false
    * @returns true if all questions are answered
    *          false if at least one answer is not answered
    */
    isResponseComplete(_onlyRequired?: boolean): boolean;
    private recursivelyCheckCompleteness;
    /**
    * Recursively iterates through nested IQuestions and extracts the given answers and adds
    * it to a given array as FHIR QuestionnaireResponseItem
    * @param question      an array of (possibly nested) IQuestions
    * @param responseItems the array to fill with the FHIR QuestionnaireResponseItems
    * @returns             the given array
    * @throws              an error if answers are not valid
    **/
    private mapIQuestionToQuestionnaireResponseItem;
    /**
    * recursively iterates through a possibly nested QuestionnaireItem and maps it to IQuestion objects.
    * @param _FHIRItem the QuestionnaireItem to start with
    */
    private mapQuestionnaireItemToIQuestion;
    private setOptionsFromExtensions;
    /**
    * Removes QuestionnaireItems with the "hidden" extension from an array of QuestionnaireItem.
    * This runs on a copy of the array passed as an argument, so it won't affect the original array.
    * @param _FHIRItems the original items of a Questionnaire
    * @param _parent optional. when not passing all items of a Questionnaire (but only the subitems of an item),
    *                the parent of the items should be given so the questionnaireResponse can be built correctly.
    *                This is used mostly for recursive use of the function.
    * @returns a copy of the _FHIRItems array, but without the items that have the FHIR hidden extension (these will be
    *          kept track of in the hiddenFhirItems property).
    */
    private filterOutHiddenItems;
    private linkDependingQuestions;
    private hasExtension;
    /**
    * Recursively searches for a IQuestion by ID.
    * @param _id the id of the IQuestion to find
    * @param _data the (nested) array of IQuestion to search in
    */
    findQuestionById(_id: string, _data: IQuestion[]): IQuestion | undefined;
    getTranslationsFromExtension(languageExtensions: {
        extension: Array<{
            extension: Array<any>;
        }>;
    }): {
        [language: string]: string;
    };
    private getTranslationsFromDesignation;
}
