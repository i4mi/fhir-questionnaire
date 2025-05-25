import { Questionnaire, QuestionnaireResponse, Reference, Resource, ValueSet } from '@i4mi/fhir_r4';
import { IQuestion, IAnswerOption } from './IQuestion';
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
    availableLanguages: string[];
    lastRestored?: Date;
    responseIdToSynchronize?: string;
    constructor(_questionnaire: Questionnaire, _availableLanguages?: string[], _valueSets?: {
        [url: string]: ValueSet;
    }, _items?: IQuestion[], _hiddenFhirItems?: {
        item: IQuestion;
        parentLinkId?: string;
    }[]);
    /**
     * Returns the storeable data of the object as a string, not including the questionnaire.
     * When rehydrating with a serialized QuestionnaireData string, you can create a new
     * QuestionnaireData object using the Questionnaire and then call .unserialize() on it,
     * passing the serialized string
     * @returns a string representing the QuestionnaireData object _without_ containing
     *              - the fhir Questionnaire
     * @see     unserialize()
     */
    serialize(): string;
    /**
     * Populates the QuestionnaireData object with data from a previously serialized
     * QuestionnaireData Object. This can be either passed on as a string from serialize() or
     * as a JSON object that was created with JSON.stringify() from a QuestionnaireData
     * @param   _data   The serialized data from a QuestionnaireData as string or JSON
     * @throws          An error if the data is passed as a string with no items property
     *                  (which is used to detect if it is a serialized QuestionnaireData)
     * @see     serialize()
     */
    unserialize(_data: string | {
        valueSets: {
            [url: string]: ValueSet;
        };
        items: IQuestion[];
        hiddenFhirItems: {
            item: IQuestion;
            parentLinkId?: string;
        }[];
        lastRestored?: Date;
        availableLanguages: string[];
        responseIdToSynchronize?: string;
    }): void;
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
    private recursivelyDisableSubItems;
    private recursivelyEnableSubitems;
    /**
    * Checks if a given IAnswerOption is already sel    ected for a IQuestion.
    * It is checking for the code of the IAnswerOption, not the display string.
    * @param _question     the IQuestion to which the answer belongs
    * @param _answer       the IAnswerOption in question
    **/
    isAnswerOptionSelected(_question: IQuestion, _answer: IAnswerOption): boolean;
    /**
    * Returns the questionnaire title in a given language.
    * Falls back to default language of the questionnaire,
    * if the wanted language is not available.
    * @param _language the language code of the wanted language.
    **/
    getQuestionnaireTitle(_language: string): string | undefined;
    /**
    * Returns the questionnaire description in a given language.
    * Falls back to default language of the questionnaire,
    * if the wanted language is not available.
    * @param _language the language code of the wanted language.
    **/
    getQuestionnaireDescription(_language: string): string | undefined;
    /**
    * Processes a QuestionnaireResponse and parses the given answers to the local iQuestion array. Existing answers are overwritten.
    * @param _fhirResponse a QuestionnaireResponse that matches the Questionnaire.
    * @throws an error if the questionnaire response is not matching the questionnaire
    **/
    restoreAnswersFromQuestionnaireResponse(_fhirResponse: QuestionnaireResponse): void;
    /**
    * Gets the QuestionnaireResponse resource with all the currently set answers.
    * @param _language the shorthand for the language the QuestionnaireResponse (eg. 'de' or 'en'),
    *                  should be in the set of available languages
    * @param _options  Options object that can contain zero, one or many of the following properties:
    *                  - date:      the date when the Questionnaire was filled out (current date by default)
    *                  - includeID: boolean that determines if to include FHIR resource ID of a potential
    *                               previously restored QuestionnaireResponse (default: false) (if the previous response has
    *                               no id, the id of the generated response will be undefined)
    *                  - patient:   a Reference to the FHIR Patient who filled out the Questionnaire
    *                  - midataExtensions: wether to include MIDATA extensions or not (default: false)
    *                  - reset:     should the questionnaire be reseted after creating the response (default: false)
    * @returns         a QuestionnaireResponse FHIR resource containing all the answers the user gave
    * @throws          - an error if the QuestionnaireResponse is not valid for the corresponding
    *                  Questionnaire, e.g. when a required answer is missing
    *                  - an error if the _language given is not in the set of available languages
    **/
    getQuestionnaireResponse(_language: string, _options?: {
        date?: Date;
        includeID?: boolean;
        patient?: Reference;
        midataExtensions?: boolean;
        reset?: boolean;
    }): QuestionnaireResponse;
    /**
     * Recursively searches for a QuestionnaireResponseItem in a deep array.
     * @param id        the id of the item to find
     * @param items     the array of items
     * @returns         the QuestionnaireResponseItem if found, or undefined if no item matches
     */
    private recursivelyFindId;
    /**
     * Recursively removes empty arrays on item (because we don't want empty arrays in QuestionnaireResponses)
     * @param _items    the input array of items to iterate through
     * @returns         the deep cleaned input array, or undefined if the input array was empty
     */
    private recursivelyCleanEmptyArrays;
    /**
     * Recursively generates the narrative html for QuestionnaireResponseItems.
     * @param _items      the items to be represented
     * @param _topLevel?  indicates if we are on the top level. do not set to true when calling recursively.
     * @returns           a string containging html code that represents the QuestionnaireResponseItems
     */
    private getNarrativeString;
    /**
     * Recursively generates the narrative html for a single QuestionnaireResponseItem.
     * @param _item     the item
     * @returns         a string containging html code that represents the QuestionnaireResponseItem
     */
    private getItemString;
    /**
    * Returns the questionnaire URL with version number in FHIR canonical format.
    * @return a canonical questionnaire URL, or an empty string if no URL is available
    **/
    getQuestionnaireURLwithVersion(): string;
    /**
    * Checks a QuestionnaireResponse for completeness.
    * @param   _onlyRequired optional parameter, to specify if only questions with
    *          the required attribute need to be answered or all questions;
    *          default value is: false
    * @param   _markInvalid optional parameter, to specify if not completed questions
    *          should be updated to be invalid (see isInvalid property)
    *          default value is: true
    * @returns true if all questions are answered
    *          false if at least one answer is not answered
    */
    isResponseComplete(_onlyRequired?: boolean, _markInvalid?: boolean): boolean;
    /**
     * Determines if a question has an answer, when an answer is required. Also checks potential subquestions,
     * if these are activated.
     * @param _question      the question that should be checked
     * @param _markInvalid   optional parameter, indicates if the question (and subquestion) should be marked as invalid
     *                       if the question is not complete. defaults to true.
     * @returns              TRUE, if the question either does not require an answer, or does require and has at least one answer.
     *                       if the questions subquestions are activated and not complete, the parent question is also regarded incomplete
     *                       and thus FALSE is returned.
     */
    isQuestionComplete(_question: IQuestion, _markInvalid?: boolean): boolean;
    /**
     * Determines if any question has been answered yet. Also checks subquestions, if activated.
     * @returns: TRUE, if at least one question has an answer
     *           FALSE, if all questions remain unanswered
     */
    isTouched(): boolean;
    /**
    * recursively iterates through a possibly nested QuestionnaireItem and maps it to IQuestion objects.
    * @param _FHIRItem the QuestionnaireItem to start with
    */
    private mapQuestionnaireItemToIQuestion;
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
    /**
     *
     * @param _FHIRItem
     * @param _currentQuestion
     * @returns                 An array of objects describing the depending questions.
     */
    private linkDependingQuestions;
    /**
    * Populates the questions with initialExpression FHIRPath extensions with data from given resources.
    * The FHIRPath resources need to specify the needed resource type with %type as first node of the FHIRPath
    * expressions (e.g. '%patient.name.given.first()').
    * @param _resources     array of resources used to populate the answers (e.g. Patient resource). Each resource
    *                       type can only be in the array once.
    * @param _overWriteExistingAnswers (optional) specifies if existing answers should be overwritten (default: false)
    */
    populateAnswers(_resources: Resource[], _overWriteExistingAnswers?: boolean): void;
    /**
    * Finds the answerOption that matches a criterium, so on choice question, populated answers are exactly like the answer option.
    * AnswerOptions of type valueAttachment can't be found like that.
    * @param criterium      Can be just a string, or a QuestionnaireResponseItemAnswer. Defines which answer option should be found
    * @param answerOptions  The answerOptions of an item, array that will be searched.
    **/
    private findAccordingAnswerOption;
    /**
     * Checks if an initial value is valid for a given question
     * @param initial   the initial value from the FHIR questionnaire
     * @param item      the IQuestion with the value
     * @returns         TRUE, if the initial value has a value[x] of the correct type of the
     *                  item, FALSE if not, or if it is a choice question with answerOptions
     */
    private checkIfIsSameType;
    /**
    * Recursively searches for a IQuestion by ID. This is useful if a Questionnaires questions
    * are nested on multiple layers.
    * @param _id    the id of the IQuestion to find
    * @param _data? the (nested) array of IQuestion to search in. If no data is provided, search is
    *               performed over all questions of the QuestionnaireData
    */
    findQuestionById(_id: string, _data?: IQuestion[]): IQuestion | undefined;
    /**
     * Gets translations from designation like in an embedded valueset.
     * @param languageDesignations  the designations from the valueset
     * @returns                     an object key/value pair with the languages
     *                              and the matching strings
     */
    private getTranslationsFromDesignation;
    /**
     * Creates a fallback I18N object with a string for when no I18N is available. All available languages will have
     * the same, fallback, translation string
     * @param _text     the fallback string
     * @returns         an object key/value pair with each available language having set the translation string
     */
    private getFallbackTranslationStrings;
    /**
     * Searches for the QuestionnaireItem in the FHIR Questionnaire
     * @param id        the id of the item to find
     * @param subItems  optional (for recursivitiy): an array to search in
     * @returns         the QuestionnaireItem, or undefined if no item can be found
     */
    private findFhirItem;
}
