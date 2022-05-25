import fhirpath from 'fhirpath';
import { Questionnaire, QuestionnaireResponse, QuestionnaireResponseStatus, QuestionnaireResponseItem, QuestionnaireItemType,
    Resource, ValueSet, QuestionnaireItem, Reference, QuestionnaireResponseItemAnswer, Extension, code, QuestionnaireItemOperator} from "@i4mi/fhir_r4";
import { IQuestion, IAnswerOption, IQuestionOptions, ItemControlType } from "./IQuestion";

const UNSELECT_OTHERS_EXTENSION = "http://midata.coop/extensions/valueset-unselect-others";
const ITEM_CONTROL_EXTENSION = 'http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl';
const ITEM_CONTROL_EXTENSION_SYSTEM = 'http://hl7.org/fhir/questionnaire-item-control';
const MIN_VALUE_EXTENSION = 'http://hl7.org/fhir/StructureDefinition/minValue';
const MAX_VALUE_EXTENSION = 'http://hl7.org/fhir/StructureDefinition/maxValue';
const ENTRY_FORMAT_EXTENSION = 'http://hl7.org/fhir/StructureDefinition/entryFormat';
const SLIDER_STEP_VALUE_EXTENSION = 'http://hl7.org/fhir/StructureDefinition/questionnaire-sliderStepValue';
const UNIT_EXTENSION = 'http://hl7.org/fhir/StructureDefinition/questionnaire-unit';
const HIDDEN_EXTENSION = "http://hl7.org/fhir/StructureDefinition/questionnaire-hidden";
const CALCULATED_EXPRESSION_EXTENSION = 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-calculatedExpression';
const QUESTIONNAIRERESPONSE_CODING_EXTENSION_URL = 'http://midata.coop/extensions/response-code';
const INITIAL_EXPRESSION_EXTENSION = 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-initialExpression';

const PRIMITIVE_VALUE_X = [
    'valueString',
    'valueInteger',
    'valueBoolean',
    'valueDecimal',
    'valueDate',
    'valueDateTime',
    'valueTime',
    'valueUri'
];
const COMPLEX_VALUE_X = [
    {
        type: 'valueCoding',
        isMatching: (criterium: QuestionnaireResponseItemAnswer, answerOption: IAnswerOption) => {
            if (criterium.valueCoding && answerOption.code.valueCoding) {
                return criterium.valueCoding.system === answerOption.code.valueCoding.system
                        && criterium.valueCoding.code === answerOption.code.valueCoding.code;
            } else {
                return false;
            }
        }
    },
    {
        type: 'valueAttachment',
        isMatching: (criterium: QuestionnaireResponseItemAnswer, answerOption: IAnswerOption) => {
            if (criterium.valueAttachment) {
                console.log('Sorry, picking valueAttachment from AnswerOptions is currently not supported.');
            }
            return false;
        }
    },
    {
        type: 'valueReference',
        isMatching: (criterium: QuestionnaireResponseItemAnswer, answerOption: IAnswerOption) => {
            if (criterium.valueReference && answerOption.code.valueReference) {
                return criterium.valueReference.reference === answerOption.code.valueReference.reference
                        || criterium.valueReference.identifier === answerOption.code.valueReference.identifier;
            } else {
                return false;
            }
        }
    },
    {
        type: 'valueQuantity',
        isMatching: (criterium: QuestionnaireResponseItemAnswer, answerOption: IAnswerOption) => {
            if (criterium.valueQuantity && answerOption.code.valueQuantity) {
                return criterium.valueQuantity.value === answerOption.code.valueQuantity.value
                        && (
                            criterium.valueQuantity.unit === answerOption.code.valueQuantity.unit
                            || criterium.valueQuantity.code === answerOption.code.valueQuantity.code
                        );
            } else {
                return false;
            }
        }
    }
];

export class QuestionnaireData {
    // the FHIR resources we work on
    fhirQuestionnaire: Questionnaire;
    valueSets: {
        [url: string]: ValueSet
    };
    // the data we work with
    items: IQuestion[];
    hiddenFhirItems: {
        item: IQuestion,
        parentLinkId?: string
    }[];
    lastRestored: Date | undefined;
    availableLanguages: string[];
    responseIdToSynchronize: string | undefined;

    constructor(_questionnaire: Questionnaire, _availableLanguages?: string[], _valueSets?: {[url: string]: ValueSet}, _items?: IQuestion[], _hiddenFhirItems?: {item: IQuestion, parentLinkId?: string}[]){
        this.fhirQuestionnaire = _questionnaire;
        this.items = new Array<IQuestion>();
        this.hiddenFhirItems = new Array<{item: IQuestion,parentLinkId?: string}>();
        this.availableLanguages = _availableLanguages || [];
        this.valueSets = {};

        if (_valueSets) {
            this.valueSets = _valueSets;
        } else if (this.fhirQuestionnaire.contained) {
            // process contained valuesets
            // TODO: prepare for not contained valuesets

            this.fhirQuestionnaire.contained.forEach((resource: Resource) => {
                if(resource.resourceType === 'ValueSet') {
                    const valueSet = resource as ValueSet;
                    if(valueSet.id) {
                        this.valueSets[valueSet.id] = valueSet;
                    }
                }
            });
        }

        if (_items) {
            this.items = _items;
            this.hiddenFhirItems = _hiddenFhirItems
                                    ? _hiddenFhirItems
                                    : [];
        } else {
            this.items = new Array<IQuestion>();
            this.resetResponse();
        }
    }

    /**
    * Resets the response to the questionnaire
    **/
    resetResponse() {
        if (this.items.length > 0) {
            this.items = new Array<IQuestion>();
        }
        this.hiddenFhirItems = new Array<{item: IQuestion, parentLinkId?: string}>();

        let questionsDependencies: {id: string, reference?: IQuestion, operator: QuestionnaireItemOperator, answer: any}[] = []; // helper array for dependingQuestions

        if (this.fhirQuestionnaire.item) {
            this.filterOutHiddenItems(this.fhirQuestionnaire.item).forEach((item) => {
                // recursively process items
                let currentQuestion = this.mapQuestionnaireItemToIQuestion(item);

                let dependingToQuestions = this.linkDependingQuestions(item, currentQuestion);

                if (dependingToQuestions.length > 0){
                    questionsDependencies = questionsDependencies.concat(dependingToQuestions);
                }
                this.items.push(currentQuestion);
            });

            // now we stepped through all the items and the helper array is complete, we can add depending questions to their determinators
            questionsDependencies.forEach((question) => {
                const determinator = this.findQuestionById(question.id, this.items);
                if (question.reference && determinator) {
                    const existingDependingQuestion = determinator.dependingQuestions.find(q => q.dependingQuestion == question.reference);
                    if (existingDependingQuestion) {
                        existingDependingQuestion.criteria.push({
                            answer: question.answer,
                            operator: question.operator
                        });
                    } else {
                        determinator.dependingQuestions.push({
                            dependingQuestion: question.reference,
                            criteria: [{
                                answer: question.answer,
                                operator: question.operator
                            }]
                        });
                    }
                }
            });
        }
    }

    /**
    * Returns the questions array.
    **/
    getQuestions(): IQuestion[] {
        return this.items;
    }

    /**
     * Updates the selected answer(s) of a question: adds the answer if it's not already selected
     * and removes it, if it was selected.
     * @param _question     the IQuestion to which the answer belongs
     * @param _answer       the selected / unselected QuestionnaireItemAnswerOption
     **/
    updateQuestionAnswers(_question: IQuestion, _answer: IAnswerOption | undefined): void {
        if (_answer === undefined
           || (_question.type === QuestionnaireItemType.INTEGER && _answer.code.valueInteger == undefined)
           || (_question.type === QuestionnaireItemType.STRING && _answer.code.valueString == '')
           || (_question.type === QuestionnaireItemType.DATE && _answer.code.valueDate == '')) {
               // remove previous given answers
            _question.selectedAnswers.splice(0,_question.selectedAnswers.length);
            return;
        }

        const indexOfAnswer = _question.selectedAnswers.indexOf(_answer.code);
        if (_question.allowsMultipleAnswers) {
            // check if item is already selected
            if (indexOfAnswer >= 0) { // answer is already selected
                _question.selectedAnswers.splice(indexOfAnswer,1) // remove answer
            } else {
                // if not already selected, we select it now
                _question.selectedAnswers.push(_answer.code);

                // and disable other answers when necessary
                if(_answer.disableOtherAnswers) {
                    _answer.disableOtherAnswers.forEach((otherAnswer) => {
                        const indexOfOtherAnswer = _question.selectedAnswers.findIndex(( selectedAnswer ) => {
                            return selectedAnswer.valueCoding
                                        ? selectedAnswer.valueCoding.code === otherAnswer
                                        : undefined;
                        });
                        if (indexOfOtherAnswer >= 0) { // otherAnswer is selected
                            _question.selectedAnswers.splice(indexOfOtherAnswer,1) // remove otherAnswer)
                        } // no else needed, because we don't have to unselect already unselected answers
                    })
                }
            }
        } else {
            if (indexOfAnswer < 0) {
                _question.selectedAnswers[0] = _answer.code;
            }
        }

        _question.dependingQuestions.forEach((dependingQuestion) => {
            dependingQuestion.dependingQuestion.isEnabled = (_question.dependingQuestionsEnableBehaviour == 'all'); // when it's all we start with true, when undefined or any with false
            dependingQuestion.criteria.forEach(criterium => {
                let evaluatesToTrue = false;
                if (criterium.answer.valueCoding && criterium.answer.valueCoding.code
                    && _answer.code.valueCoding && _answer.code.valueCoding.code) {

                    evaluatesToTrue = this.evaluateAnswersForDependingQuestion(_answer.code.valueCoding.code, criterium.answer.valueCoding.code, criterium.operator);
                } // check if we have valueString and question is not already enabled
                else if (criterium.answer.valueString && _answer.code.valueString && !dependingQuestion.dependingQuestion.isEnabled) {
                    evaluatesToTrue = this.evaluateAnswersForDependingQuestion(_answer.code.valueString, criterium.answer.valueString, criterium.operator);
                }
                dependingQuestion.dependingQuestion.isEnabled = (_question.dependingQuestionsEnableBehaviour == 'all')
                                                                    ? (evaluatesToTrue && dependingQuestion.dependingQuestion.isEnabled) // only true, when criteria before were true
                                                                    : (evaluatesToTrue || dependingQuestion.dependingQuestion.isEnabled) // true when evaluates to true or questions before were true
            });
        });
    }

    /**
    * Evaluates a given answer with a criterium and an operator, for enabling and disabling depending questions.
    * @param _answer        the given answer, as string (also for code etc) or as a number (when using GE, GT, LE & LT operator)
    * @param _criterium     the criterium against which the given answer is compared
    * @param _operator      defines if the answer and criterium must be equal or not equal etc.
    * @returns              true if answer and criterium match with the given operator, false if not so.
    **/
    private evaluateAnswersForDependingQuestion(_answer: string | number , _criterium: string | number, _operator: QuestionnaireItemOperator): boolean {
        // make sure we have both comparants as number if one is
        if (typeof _answer === 'number' && typeof _criterium === 'string') {
            _criterium = Number(_criterium);
        } else if (typeof _criterium === 'number' && typeof _answer === 'string') {
            _answer = Number(_answer);
        }

        switch (_operator) {
            case QuestionnaireItemOperator.EXISTS:
                return _answer !== undefined;
            case QuestionnaireItemOperator.E:
                return _answer === _criterium;
            case QuestionnaireItemOperator.GE:
                return _answer >= _criterium;
            case QuestionnaireItemOperator.LE:
                return _answer <= _criterium;
            case QuestionnaireItemOperator.GT:
                return _answer > _criterium;
            case QuestionnaireItemOperator.LT:
                return _answer < _criterium;
            case QuestionnaireItemOperator.NE:
                return _answer != _criterium && _answer !== undefined;
            default: return false;
        }
    }


    /**
    * Checks if a given IAnswerOption is already selected for a IQuestion.
    * @param _question     the IQuestion to which the answer belongs
    * @param _answer       the IAnswerOption in question
    **/
    isAnswerOptionSelected(_question: IQuestion, _answer: IAnswerOption): boolean {
        return _question.selectedAnswers.findIndex((selectedAnswer) => {
            return JSON.stringify(selectedAnswer) == JSON.stringify(_answer.code);
        }) > -1;
    }

    /**
    * Returns the questionnaire title in a given language.
    * @param _language the language code of the wanted language
    **/
    getQuestionnaireTitle(_language: string): string | undefined {
        if (this.fhirQuestionnaire._title && this.fhirQuestionnaire._title.extension) {
            return this.getTranslationsFromExtension(this.fhirQuestionnaire._title as {extension: Array<{extension: Array<any>}>})[_language]
        } else {
            return undefined;
        }
    }

    /**
    * Processes a QuestionnaireResponse and parses the given answers to the local iQuestion array
    * @param _fhirResponse a QuestionnaireResponse that matches the Questionnaire
    * @throws an error if the questionnaire response is not matching the questionnaire
    **/
    restoreAnswersFromQuestionnaireResponse(_fhirResponse: QuestionnaireResponse): void {
        const answerMatchingIQuestionItemWithFhirResponseItem = (_fhirItems: QuestionnaireResponseItem[]): void => {
            _fhirItems.forEach((answerItem) => {
                const item = this.findQuestionById(answerItem.linkId, this.items);
                if (item) {
                    item.selectedAnswers = [];
                    if (item.answerOptions && item.answerOptions.length > 0 && answerItem.answer) {
                        answerItem.answer.forEach((answer) => {
                            const answerAsAnswerOption = this.findAccordingAnswerOption(answer, item.answerOptions);

                            if (answerAsAnswerOption) {
                                this.updateQuestionAnswers(item, answerAsAnswerOption);
                            } else {
                                item.selectedAnswers = answerItem.answer
                                                            ? answerItem.answer
                                                            : [];
                            }
                        });
                    } else if (answerItem.answer && answerItem.answer.length > 0) {
                        if (item.allowsMultipleAnswers) {
                            item.selectedAnswers = answerItem.answer;
                        } else {
                            item.selectedAnswers.push(answerItem.answer[0]);
                        }
                    }
                    if (answerItem.item) {
                        answerMatchingIQuestionItemWithFhirResponseItem(answerItem.item);
                    }
                } else {
                    console.warn('Item with linkId ' + answerItem.linkId + ' was found in QuestionnaireResponse, but does not exist in Questionnaire.');
                }
            })
        }

        // only restore, if it is not already up to date
        if (this.lastRestored == undefined || (_fhirResponse.authored && this.lastRestored < new Date(_fhirResponse.authored))) {
            this.lastRestored = _fhirResponse.authored
                                    ? new Date(_fhirResponse.authored)
                                    : new Date();
            this.responseIdToSynchronize = _fhirResponse.id;
            const questionnaireUrl = _fhirResponse.questionnaire
                                        ? _fhirResponse.questionnaire.split('|')[0]
                                        : '';
            if (this.fhirQuestionnaire.url && questionnaireUrl !== this.fhirQuestionnaire.url.split('|')[0]) {
                throw new Error('Invalid argument: QuestionnaireResponse does not match Questionnaire!');
            }
            if (_fhirResponse.item) {
                answerMatchingIQuestionItemWithFhirResponseItem(_fhirResponse.item);
            }

        }
    }

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
    getQuestionnaireResponse(_language: string, _patient?: Reference, _date?: Date, _includeID?: boolean): QuestionnaireResponse {
        // usual questionnaire response
        const fhirResponse = {
            status: this.isResponseComplete() ? QuestionnaireResponseStatus.COMPLETED : QuestionnaireResponseStatus.IN_PROGRESS,
            resourceType: 'QuestionnaireResponse',
            extension: [{
                url: QUESTIONNAIRERESPONSE_CODING_EXTENSION_URL,
                valueCoding: this.fhirQuestionnaire.code
                                ? this.fhirQuestionnaire.code[0]
                                : {}
            }],
            questionnaire: this.getQuestionnaireURLwithVersion(),
            authored: _date ? _date.toISOString() : new Date().toISOString(),
            source: _patient ? _patient : undefined,
            id: _includeID ? this.responseIdToSynchronize : undefined,
            meta: {},
            item: this.mapIQuestionToQuestionnaireResponseItem(this.items, new Array<QuestionnaireResponseItem>(),_language)
        };

        // stuff to do for items with calculated expression
        const itemsWithCalculatedExpression = this.hiddenFhirItems.filter(i => i.item.options && i.item.options.calculatedExpression !== undefined);
        itemsWithCalculatedExpression.forEach(item => {
            if (item.item.options && item.item.options.calculatedExpression) {
                try {
                    let calculatedAnswer = {};
                    switch (item.item.type) {
                        case QuestionnaireItemType.INTEGER:
                            calculatedAnswer = { valueInteger: fhirpath.evaluate(fhirResponse, item.item.options.calculatedExpression)[0] };
                            break;
                        case QuestionnaireItemType.DECIMAL:
                            calculatedAnswer = { valueDecimal: fhirpath.evaluate(fhirResponse, item.item.options.calculatedExpression)[0] };
                            break;
                        case  QuestionnaireItemType.QUANTITY:
                            const initial = item.item.initial?.find(i => i.valueQuantity != undefined)?.valueQuantity;
                            if (initial) {
                                calculatedAnswer = {
                                    valueQuantity: {
                                        value: fhirpath.evaluate(fhirResponse, item.item.options.calculatedExpression)[0],
                                        unit: initial.unit,
                                        system: initial.system,
                                        code: initial.code
                                    }
                                }
                            } else {
                                console.warn('Calculated answer for item type QUANTITY needs an initial element for defining the unit.');
                            }
                            break;
                        default:
                            console.warn('Calculated answer for item type ' + item.item.type.toUpperCase() + ' is currently not implemented.', item.item);
                    }
                    if (item.item.allowsMultipleAnswers) {
                        item.item.selectedAnswers.push(calculatedAnswer);
                    } else {
                        item.item.selectedAnswers = [calculatedAnswer];
                    }
                }
                catch(e) {
                    throw new Error ('Can not evaluate fhirpath expression for item ' + item.item.id + ': ' + item.item.options.calculatedExpression + '.');
                }
            }
            if (item.parentLinkId) {
                const recursivelyFindId = (id: string, items: QuestionnaireResponseItem[]): QuestionnaireResponseItem | undefined => {
                    let itemWithId: QuestionnaireResponseItem | undefined;
                    items.forEach(i => {
                        if (!itemWithId) {
                            if (i.linkId === id) {
                                itemWithId = i;
                            } else if (i.item) {
                                itemWithId = recursivelyFindId(id, i.item);
                            }
                        }
                    });
                    return itemWithId;
                }
                let parentItem = recursivelyFindId(item.parentLinkId, fhirResponse.item);
                if (parentItem) {
                    if (parentItem.item) {
                        parentItem.item.push(this.mapIQuestionToQuestionnaireResponseItem([item.item], new Array<QuestionnaireResponseItem>(), _language)[0]);
                    } else {
                        parentItem.item = [this.mapIQuestionToQuestionnaireResponseItem([item.item], new Array<QuestionnaireResponseItem>(), _language)[0]];
                    }
                }
            } else {
                fhirResponse.item.push(this.mapIQuestionToQuestionnaireResponseItem([item.item], new Array<QuestionnaireResponseItem>(), _language)[0]);
            }
        });
        return fhirResponse;
    }

    /**
    * Returns the questionnaire URL with version number in FHIR canonical format.
    * @return a canonical questionnaire URL
    **/
    getQuestionnaireURLwithVersion(): string {
        return this.fhirQuestionnaire.url + ( this.fhirQuestionnaire.version
            ? ('|'+  this.fhirQuestionnaire.version)
            : ''
        );
    }

    /**
    * Checks a QuestionnaireResponse for completeness.
    * @param   onlyRequired optional parameter, to specify if only questions with
    the required attribute need to be answered or all questions;
    default value is: false
    * @returns true if all questions are answered
    *          false if at least one answer is not answered
    */
    isResponseComplete(_onlyRequired?: boolean): boolean {
        _onlyRequired = _onlyRequired === true ? true : false;
        return this.recursivelyCheckCompleteness(this.items, _onlyRequired);
    }

    private recursivelyCheckCompleteness(_question: IQuestion[], _onlyRequired: boolean): boolean {
        var isComplete = true;
        _question.forEach((question) => {
            if (question.type === 'group' && question.subItems) {
                isComplete = isComplete
                ? this.recursivelyCheckCompleteness(question.subItems, _onlyRequired)
                : false;
            } else if (question.readOnly || !question.isEnabled) {
                // do nothing
            } else {
                if (question.required || !_onlyRequired) {
                    isComplete = isComplete
                    ? question.selectedAnswers && question.selectedAnswers.length > 0
                    : false;
                }
            }
            // after the first item is not complete, we don't have to look any further
            if (!isComplete) return false;
        });
        return isComplete;
    }

    /**
    * Recursively iterates through nested IQuestions and extracts the given answers and adds
    * it to a given array as FHIR QuestionnaireResponseItem
    * @param question      an array of (possibly nested) IQuestions
    * @param responseItems the array to fill with the FHIR QuestionnaireResponseItems
    * @returns             the given array
    * @throws              an error if answers are not valid
    **/
    private mapIQuestionToQuestionnaireResponseItem(_question: IQuestion[], _responseItems: QuestionnaireResponseItem[], _language: string): QuestionnaireResponseItem[] {
        _question.forEach((question) => {
            if (question.type === QuestionnaireItemType.GROUP) {
                if (question.subItems && question.subItems.length > 0) {
                    _responseItems = this.mapIQuestionToQuestionnaireResponseItem(question.subItems, _responseItems, _language);
                } else {
                    throw new Error(`Invalid question set: IQuestion with id ${question.id} is group type, but has no subItems.`);
                }
            } else if (question.isEnabled){
                // some validation
                if (question.required && question.selectedAnswers.length === 0) {
                    throw new Error(`Invalid answer set: IQuestion with id ${question.id} is mandatory, but not answered.`);
                } else if (!question.allowsMultipleAnswers && question.selectedAnswers.length > 1){
                    throw new Error(`Invalid answer set: IQuestion with id ${question.id} allows only one answer, but has more.`);
                } else {
                    const responseItem = {
                        linkId: question.id,
                        text: question.label[_language],
                        answer: new Array<QuestionnaireResponseItemAnswer>()
                    };
                    question.selectedAnswers.forEach((answer) => {
                        if (answer.valueCoding) {
                            // find translated display for answer valueCoding
                            const answerDisplayAllLanguages = (question.answerOptions.find((answerOption) => {
                                return answerOption.code.valueCoding && answer.valueCoding && answerOption.code.valueCoding.code === answer.valueCoding.code;
                            }) || {answer: ''}).answer;
                            // some answer options (e.g. zip code locations) have only one language set
                            const answerDisplay = answerDisplayAllLanguages
                                                    ? answerDisplayAllLanguages[_language]
                                                        ? answerDisplayAllLanguages[_language]
                                                        : answerDisplayAllLanguages[Object.keys(answerDisplayAllLanguages)[0]]
                                                    : '';
                            responseItem.answer.push({
                                valueCoding: {
                                    system: answer.valueCoding.system,
                                    code: answer.valueCoding.code,
                                    display: answerDisplay,
                                    extension: answer.valueCoding.extension
                                }
                            });
                        } else {
                            responseItem.answer.push(answer);
                        }
                    });

                    if (question.subItems && question.subItems.length > 0) {
                        (responseItem as QuestionnaireResponseItem).item = [];
                        this.mapIQuestionToQuestionnaireResponseItem(question.subItems, (responseItem as QuestionnaireResponseItem).item || [], _language);
                    }
                    // add to array
                    _responseItems.push(responseItem);
                }

            }
        });
        return _responseItems;
    }

    /**
    * recursively iterates through a possibly nested QuestionnaireItem and maps it to IQuestion objects.
    * @param _FHIRItem the QuestionnaireItem to start with
    */
    private mapQuestionnaireItemToIQuestion(_FHIRItem: QuestionnaireItem): IQuestion {
        const question: Partial<IQuestion> = {
            id: _FHIRItem.linkId ? _FHIRItem.linkId : '',
            required: _FHIRItem.required || false,
            prefix: _FHIRItem.prefix,
            allowsMultipleAnswers: _FHIRItem.repeats,
            answerOptions: new Array<IAnswerOption>(),
            selectedAnswers: Array<QuestionnaireResponseItemAnswer>(),
            dependingQuestions: [],
            dependingQuestionsEnableBehaviour: _FHIRItem.enableBehavior,
            isEnabled: true,
            initial: _FHIRItem.initial,
            readOnly: _FHIRItem.readOnly ? _FHIRItem.readOnly : false,
            options: this.setOptionsFromExtensions(_FHIRItem)
        }

        // detect question type
        switch (_FHIRItem.type)  {
            case QuestionnaireItemType.GROUP:
            case QuestionnaireItemType.CHOICE:
            case QuestionnaireItemType.INTEGER:
            case QuestionnaireItemType.STRING:
            case QuestionnaireItemType.DISPLAY:
            case QuestionnaireItemType.QUANTITY:
            case QuestionnaireItemType.DATE:
            case QuestionnaireItemType.TEXT:
            case QuestionnaireItemType.OPEN_CHOICE:
                question.type = _FHIRItem.type;
                break;
            default:
                console.warn(`QuestionnaireData.ts: Item type ${_FHIRItem.type} is currently not supported.`)
                //return undefined; // TODO : check this
        }

        question.label = this.getTranslationsFromExtension(_FHIRItem._text as {extension: Array<{extension: Array<any>}>});

        // first handle group items with subitems
        if (_FHIRItem.item && _FHIRItem.item.length > 0) {
            question.subItems = new Array<IQuestion>();
            _FHIRItem.item.forEach((subItem) => {
                if (question.subItems) {
                    question.subItems.push(this.mapQuestionnaireItemToIQuestion(subItem));
                }
            });
        }

        // handle the non-group items
        if (_FHIRItem.type !== QuestionnaireItemType.GROUP) {
            if (_FHIRItem.type === QuestionnaireItemType.CHOICE) {
                // process answer options from ValueSet
                if (_FHIRItem.answerValueSet && _FHIRItem.answerValueSet.indexOf('#') >= 0) { // these are the "contained valuesets"
                    let answerOptionsToUnselect = new Array<{disabler: string, toBeDisabled: string | {mustAllOthersBeDisabled: true}}>();
                    const answerValueSet = this.valueSets[_FHIRItem.answerValueSet.split('#')[1]];

                    // check if the valueset has an extension for items unselecting others
                    let unselectOtherExtensions: Extension[];
                    if (_FHIRItem.extension) {
                        unselectOtherExtensions = _FHIRItem.extension.filter((extension) => {
                            return extension.url === UNSELECT_OTHERS_EXTENSION;
                        });
                    }

                    if (answerValueSet.compose && answerValueSet.compose.include[0].concept) {
                        const system = answerValueSet.compose.include[0].system;
                        answerValueSet.compose.include[0].concept.forEach((concept) => {
                            // build answerOption objects with translations
                            const answerOption: IAnswerOption = {
                                answer: this.getTranslationsFromDesignation(concept.designation),
                                code: {
                                    valueCoding:
                                    {
                                        system: system
                                                    ? system
                                                    : answerValueSet.url,
                                        code: concept.code
                                    }
                                }
                            }

                            if (unselectOtherExtensions) {
                                // prepare the unselect-others array when an answeroption unselects other options
                                unselectOtherExtensions.forEach((extension) => {
                                    extension = extension.extension
                                                    ? extension.extension[0]
                                                    : {url: ''};
                                    if (answerOption.code.valueCoding && answerOption.code.valueCoding && extension.valueCode === answerOption.code.valueCoding.code && answerOption.code.valueCoding.code) {
                                        answerOptionsToUnselect.push({
                                            disabler: answerOption.code.valueCoding.code,
                                            toBeDisabled: {mustAllOthersBeDisabled: true}
                                        });
                                    } else if (answerOption.code.valueCoding){
                                        if (answerOption.code.valueCoding.code && extension.valueCode){
                                            answerOptionsToUnselect.push({
                                                disabler: answerOption.code.valueCoding.code,
                                                toBeDisabled: extension.valueCode
                                            });
                                        }
                                    }
                                });
                            }
                            if (question.answerOptions) {
                                question.answerOptions.push(answerOption);
                            }
                        });
                    }

                    // now we know all answerOptions, we can link the dependingAnswers from the temp array

                    answerOptionsToUnselect.forEach((answerPair) => {
                        if (question.answerOptions) {
                            const disabler = question.answerOptions.find((answerOption) => {
                                                return answerOption.code.valueCoding && answerOption.code.valueCoding.code === answerPair.disabler;
                                            });
                            let answersToBeDisabled: Array<code> = new Array<code>();
                            if (answerPair.toBeDisabled == {mustAllOthersBeDisabled: true}) {
                                // add all but the disabler option to array
                                question.answerOptions.map((answerOption) => {
                                    if (answerOption.code.valueCoding && answerOption.code.valueCoding.code && answerOption.code.valueCoding.code !== answerPair.disabler) {
                                        answersToBeDisabled.push(answerOption.code.valueCoding.code);
                                    }
                                });
                            } else {
                                answersToBeDisabled = new Array<code>();
                                // find the link to the disabled question
                                const disabledQuestion = question.answerOptions.find((answerOption) => {
                                    return answerOption.code.valueCoding
                                                ? answerOption.code.valueCoding.code === answerPair.toBeDisabled
                                                : false;
                                });
                                if (disabledQuestion && disabledQuestion.code.valueCoding && disabledQuestion.code.valueCoding.code) {
                                    answersToBeDisabled.push(disabledQuestion.code.valueCoding.code);
                                }
                            }
                            // finally assign the to be disabled questions to the disabler
                            if (disabler) {
                                disabler.disableOtherAnswers = answersToBeDisabled;
                            };
                        }
                    });

                } else if (_FHIRItem.answerOption) {
                    question.answerOptions = _FHIRItem.answerOption.map((answerOption) => {
                        let answerOptionText: {[language: string]: string} = {};
                        this.availableLanguages.forEach(language => {
                            answerOptionText[language] = '';
                        });

                        if (answerOption.valueCoding) {
                            // check if we have multi-language support
                            if (answerOption.valueCoding._display && answerOption.valueCoding._display.extension) {
                                Object.keys(answerOptionText).forEach(key => {
                                    answerOptionText[key] = this.getTranslationsFromExtension(answerOption.valueCoding._display as {extension: Array<{extension: Array<any>}>})[key]
                                });
                            } else { // when not, use the same text for every language
                                Object.keys(answerOptionText).forEach(key => {
                                    answerOptionText[key] = answerOption.valueCoding.display || '';
                                });
                            }

                        } else {
                            ['valueString', 'valueDate', 'valueTime', 'valueInteger', 'valueReference'].forEach(valueX => {
                                if (answerOption[valueX]) {
                                    if (answerOption['_' + valueX]) {
                                        Object.keys(answerOptionText).forEach(key => {
                                            answerOptionText[key] = this.getTranslationsFromExtension(answerOption['_' + valueX] as {extension: Array<{extension: Array<any>}>})[key]
                                        });
                                    } else {
                                        Object.keys(answerOptionText).forEach(key => {
                                            answerOptionText[key] = answerOption[valueX];
                                        });
                                    }
                                }
                            });
                        }

                        return {
                            answer: answerOptionText,
                            code: answerOption
                        };
                    })

                } else { // no answerValueSet available
                    console.warn('CHOICE questiony need answerOptions or an answerValueSet. No embedded answerValueSet found for ' + _FHIRItem.answerValueSet);
                }
            } else if (_FHIRItem.type === QuestionnaireItemType.INTEGER || _FHIRItem.type === QuestionnaireItemType.STRING) {
                // TODO: really nothing to do here?
            } else if (_FHIRItem.type === QuestionnaireItemType.DISPLAY) {
                question.readOnly = true;
            } else if (_FHIRItem.type === QuestionnaireItemType.QUANTITY) {
                if (question.options && question.options.controlType == ItemControlType.SLIDER && question.options.min !== undefined && question.options.max !== undefined) {
                    question.answerOptions = [
                        {
                            answer: {
                                // TODO: make dynamic
                                de: 'Wert mit Slider ausgewählt ($MIN$ - $MAX$)'.replace('$MIN$', question.options.min.toString()).replace('$MAX$', question.options.max.toString()),
                                fr: 'Valeur sélectionnée avec le slider ($MIN$ - $MAX$)'.replace('$MIN$', question.options.min.toString()).replace('$MAX$', question.options.max.toString())
                            },
                            code:  {
                                valueQuantity: question.options.unit
                                                ? {
                                                    value: undefined,
                                                    system: question.options.unit.system,
                                                    unit:  question.options.unit.display,
                                                    code: question.options.unit.code
                                                }
                                                : {}
                            }
                        }
                    ]
                } else {
                    if (this.hasExtension(HIDDEN_EXTENSION, undefined, _FHIRItem) == undefined) {
                        console.warn('QuestionnaireData: Item type QUANTITY is currently only supported with slider extension', _FHIRItem);
                    }
                }
            } else if (_FHIRItem.type === QuestionnaireItemType.DATE) {
                // nothing to do
            } else if (_FHIRItem.type === QuestionnaireItemType.OPEN_CHOICE) {
                // nothing to do
            } else if (_FHIRItem.type === QuestionnaireItemType.TEXT) {
                // nothing to do
            } else {
                // TODO: implement other answerOptions
                console.warn('QuestionnaireData: Currently only items of type GROUP, CHOICE, INTEGER, STRING, TEXT QUANTITY, DATE, OPEN_CHOICE or DISPLAY are supported.', _FHIRItem);
            }
        }
        return question as IQuestion;
    }

    private setOptionsFromExtensions(_FHIRItem: QuestionnaireItem): IQuestionOptions | undefined {
        const itemControlExtension = this.hasExtension(ITEM_CONTROL_EXTENSION, ITEM_CONTROL_EXTENSION_SYSTEM, _FHIRItem);
        const calculatedExpressionExtension = this.hasExtension(CALCULATED_EXPRESSION_EXTENSION, 'text/fhirpath', _FHIRItem);
        const initialExpressionExtension = this.hasExtension(INITIAL_EXPRESSION_EXTENSION, 'text/fhirpath', _FHIRItem);

        let returnValue: IQuestionOptions = {
            min: this.hasExtension(MIN_VALUE_EXTENSION, undefined, _FHIRItem),
            max: this.hasExtension(MAX_VALUE_EXTENSION, undefined, _FHIRItem),
            format: this.hasExtension(ENTRY_FORMAT_EXTENSION, undefined, _FHIRItem),
            sliderStep: this.hasExtension(SLIDER_STEP_VALUE_EXTENSION, undefined, _FHIRItem),
            unit: this.hasExtension(UNIT_EXTENSION, 'https://ucum.org', _FHIRItem),
            calculatedExpression: calculatedExpressionExtension ? calculatedExpressionExtension.expression : undefined,
            initialExpression: initialExpressionExtension ? initialExpressionExtension.expression : undefined
        };

        if (itemControlExtension) {
            Object.values(ItemControlType).forEach((typeCode) => {
                if (!returnValue.controlType && itemControlExtension.code === typeCode) {
                    returnValue.controlType = typeCode;
                }
            });
        }
        return returnValue;
    }

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
    private filterOutHiddenItems(_FHIRItems: QuestionnaireItem[], _parent?: QuestionnaireItem): QuestionnaireItem[] {
        let returnArray = new Array<QuestionnaireItem>();
        JSON.parse(JSON.stringify(_FHIRItems)).forEach((item: QuestionnaireItem) => {
            if (item.item) {
                item.item = this.filterOutHiddenItems(item.item, item);
            }
            const hasHidden = this.hasExtension(HIDDEN_EXTENSION, undefined, item)
            if ( hasHidden ) {
                this.hiddenFhirItems.push({
                    item: this.mapQuestionnaireItemToIQuestion(item),
                    parentLinkId: _parent ? _parent.linkId : undefined
                });
            } else {
                returnArray.push(item);
            }
        });
        return returnArray;
    }

    private linkDependingQuestions(_FHIRItem : QuestionnaireItem, _currentQuestion : IQuestion): {id: string, reference: IQuestion | undefined, operator: QuestionnaireItemOperator, answer: any}[]{
        let dependingQuestions = new Array<{id: string, reference: IQuestion | undefined, operator: QuestionnaireItemOperator, answer: any}>();

        if (_FHIRItem.item && _FHIRItem.item.length > 0) {

            _FHIRItem.item.forEach((item, index) => {
                if (_currentQuestion.subItems) {
                    dependingQuestions = dependingQuestions.concat(this.linkDependingQuestions(item, _currentQuestion.subItems[index]) );
                }
            });
        }

        if (_FHIRItem.enableWhen) {
            _currentQuestion.isEnabled = false;
            _FHIRItem.enableWhen.forEach((determinator) => {
                if (determinator.answerString || determinator.answerCoding) {
                    dependingQuestions.push({
                        id: determinator.question,
                        reference: _currentQuestion,
                        operator: determinator.operator,
                        answer: determinator.answerCoding
                                    ? {
                                        valueCoding: determinator.answerCoding
                                    }
                                    : {
                                        valueString: determinator.answerString
                                    }
                    });
                } else {
                    // TODO: implement other types when needed
                    console.warn(`QuestionnaireData.ts: Currently only answerCoding and answerString supported for depending questions (Question ${_FHIRItem.linkId})`);
                }
            });
        }
        return dependingQuestions;
    }

    /*
    * Checks if a item has a given extension, and returns the value of the extension (when one of the following:
    *   - valueCodeableConcept
    *   - valueDuration
    *   - valueString
    *   - valueInteger
    *   - valueDate
    *   - valueExpression
    *   - valueBoolean (CAVE: when the valueBoolean is FALSE, the method will return FALSE!)
    *   )
    *   If the extension exists with another value, the method returns TRUE.
    *   If the extension does not exist, the method returns UNDEFINED.
    */
    private hasExtension(_extensionURL: string, _extensionSystem: string | undefined, _item: QuestionnaireItem): any {
        let returnValue: any = undefined;
        if (_item.extension) {
            _item.extension.forEach((extension) => {
                if (!returnValue && extension.url === _extensionURL) {
                    if (_extensionSystem && extension.valueCodeableConcept && extension.valueCodeableConcept.coding) {
                        extension.valueCodeableConcept.coding.forEach((coding) => {
                            if (coding.system === _extensionSystem) {
                                returnValue = coding;
                            }
                        });
                    }
                    if (extension.valueDuration && extension.valueDuration.system && extension.valueDuration.system === _extensionSystem) {
                        returnValue = extension.valueDuration;
                    }
                    if (extension.valueInteger != undefined) {
                        returnValue = extension.valueInteger;
                    }
                    if (extension.valueString) {
                        returnValue = extension.valueString;
                    }
                    if (extension.valueBoolean) {
                        returnValue = extension.valueBoolean;
                    }
                    if (extension.valueDate) {
                        returnValue = extension.valueDate;
                    }
                    if (extension.valueExpression && extension.valueExpression.language && extension.valueExpression.language=== _extensionSystem) {
                        returnValue = extension.valueExpression;
                    }
                    return (returnValue
                        ? returnValue
                        : true);
                }
            });
        }

        return returnValue;
    }

    /**
    * Populates the questions with initialExpression FHIRPath extensions with data from given resources.
    * The FHIRPath resources need to specify the needed resource type with %type as first node of the FHIRPath
    * expressions (e.g. '%patient.name.given.first()').
    * @param _resources     array of resources used to populate the answers (e.g. Patient resource). Each resource
    *                       type can only be in the array once.
    * @param _overWriteExistingAnswers (optional) specifies if existing answers should be overwritten (default: false)
    */
    populateAnswers(_resources: Resource[], _overWriteExistingAnswers?: boolean): void {
        let resources = {};
        _resources.forEach(r => {
            if (r.resourceType) {
                resources[r.resourceType.toLowerCase()] = r;
            }
        });
        const recursivelyPopulate = (_items: IQuestion[]) => {
            _items.forEach(item => {
                if (item.subItems) {
                    recursivelyPopulate(item.subItems);
                }
                if ((_overWriteExistingAnswers || item.selectedAnswers.length === 0) && item.options && item.options.initialExpression) {
                    const expression = item.options.initialExpression;
                    if (expression.indexOf('%') == -1) {
                        console.warn('QuestionnaireData: Can not populate with initialExpression for item ' + item.id + ': initialExpression does not specify context variable (' + expression + ')');
                    } else {
                        const type = expression.split('.')[0].substring(1).toLowerCase();
                        const resource = resources[type];
                        if (resource) {
                            const value = fhirpath.evaluate(resource, expression.substring(type.length + 2))[0];
                            if (value) {
                                let populatedAnswer: IAnswerOption = { answer: {}, code: {} };
                                this.availableLanguages.forEach(l => {
                                    populatedAnswer.answer[l] = value;
                                })

                                // todo handle correct way for every type
                                switch(item.type) {
                                    case QuestionnaireItemType.CHOICE:
                                        populatedAnswer = this.findAccordingAnswerOption(value, item.answerOptions) || populatedAnswer;
                                        break;
                                    case QuestionnaireItemType.STRING:
                                        populatedAnswer.code.valueString = value.toString();
                                        break;
                                    case QuestionnaireItemType.INTEGER:
                                        populatedAnswer.code.valueInteger = Number(value);
                                        break;
                                    case QuestionnaireItemType.BOOLEAN:
                                        populatedAnswer.code.valueBoolean = value.toLowerCase() === 'true';
                                        break;
                                    case QuestionnaireItemType.DATE:
                                        populatedAnswer.code.valueDate = value.toString();
                                        break;
                                    case QuestionnaireItemType.DATETIME:
                                        populatedAnswer.code.valueDateTime = value.toString();
                                        break;
                                    case QuestionnaireItemType.DECIMAL:
                                        populatedAnswer.code.valueDecimal = Number(value);
                                        break;
                                    case QuestionnaireItemType.QUANTITY:
                                        populatedAnswer.code.valueQuantity = {
                                            value: Number(value.split(' ')[0]),
                                            unit: value.split(' ')[1]
                                        }
                                        break;
                                    case QuestionnaireItemType.TIME:
                                        populatedAnswer.code.valueTime = value.toString();
                                        break;
                                    case QuestionnaireItemType.REFERENCE:
                                        populatedAnswer.code.valueReference = {
                                            reference: value.toString()
                                        };
                                        break;
                                    default:
                                        console.log('Population of items of type' + item.type + ' is currently not supported by QuestionnaireData. Please inform the developer or create an issue on Github with specifying the missing type.');
                                }
                                if (populatedAnswer.code !== {}) {
                                    this.updateQuestionAnswers(item, populatedAnswer)
                                }
                            } else {
                                console.log('No value found for expression ' + expression + '.');
                            }

                        } else {
                            console.warn('QuestionnaireData: Can not populate with initialExpression for item ' + item.id + ': Missing context resource of type ' + type);
                        }
                    }
                }
            });
        };
        recursivelyPopulate(this.items);
    }

    /**
    * Finds the answerOption that matches a criterium, so on choice question, populated answers are exactly like the answer option.
    * AnswerOptions of type valueAttachment can't be found like that.
    * @param criterium      Can be just a string, or a QuestionnaireResponseItemAnswer. Defines which answer option should be found
    * @param answerOptions  The answerOptions of an item, array that will be searched.
    **/
    private findAccordingAnswerOption(criterium: string | QuestionnaireResponseItemAnswer, answerOptions: IAnswerOption[]): IAnswerOption | undefined {
        return answerOptions.find((answerOption) => {
            let foundIt = false;
            // first check the primitive types
            PRIMITIVE_VALUE_X.forEach((valueX) => {
                if (!foundIt) {
                    const comparator = typeof criterium === 'string'
                                        ? criterium
                                        : criterium[valueX];
                    if (comparator && answerOption.code[valueX]) {
                        foundIt = answerOption.code[valueX].toString() === comparator.toString();
                    }
                }
            });

            // if not sucessful, check the complex types
            COMPLEX_VALUE_X.forEach((valueX) => {
                if (!foundIt) {
                    let comparator = criterium;
                    if (typeof criterium === 'string') {
                        // we just assume the string has the matching code system / unit / whatever for the complex type.
                        comparator = JSON.parse(JSON.stringify(answerOption.code)) as QuestionnaireResponseItemAnswer;
                        if (comparator.valueCoding) {
                            comparator.valueCoding.code = criterium;
                        }
                        if (comparator.valueQuantity) {
                            comparator.valueQuantity.value = Number(criterium)
                        }
                        if (comparator.valueReference) {
                            comparator.valueReference.reference = criterium;
                        }
                    }
                    foundIt = valueX.isMatching(comparator as QuestionnaireResponseItemAnswer, answerOption);
                }
            });
            return foundIt;
        });
    }

    /**
    * Recursively searches for a IQuestion by ID.
    * @param _id the id of the IQuestion to find
    * @param _data the (nested) array of IQuestion to search in
    */
    findQuestionById(_id: string, _data: IQuestion[]): IQuestion | undefined {
        let result: IQuestion | undefined = undefined;
        _data.forEach((question) => {
            if (!result) {
                if (question.id === _id) {
                    result = question;
                } else if (question.subItems) {
                    result = this.findQuestionById(_id, question.subItems);
                }
            }
        });
        return result;
    }

    getTranslationsFromExtension(languageExtensions: {extension: Array<{extension: Array<any>}>}): {[language: string]: string} {
        let translations: {[language: string]: string} = {};
        Array.prototype.forEach.call(languageExtensions.extension, (extension) => {
            const languageCode = extension.extension.find((extensionItem: { url: string; valueCode: string }) => extensionItem.url === 'lang').valueCode;
            const content = extension.extension.find((extensionItem: { url: string; valueString: string }) => extensionItem.url === 'content').valueString;
            translations[languageCode] = content;
        });
        return translations;
    }

    private getTranslationsFromDesignation(languageDesignations: any): {[language: string]: string} {
        let translations: {[language: string]: string} = {};
        Array.prototype.forEach.call(languageDesignations, (designation: { language: string; value: string; }) => {
            translations[designation.language] = designation.value;
        })
        return translations;
    }
}