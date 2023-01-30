import fhirpath from 'fhirpath';
import { Questionnaire, QuestionnaireResponse, QuestionnaireEnableWhenBehavior, Reference, QuestionnaireResponseStatus, QuestionnaireResponseItem, QuestionnaireItemType,
    Resource, ValueSet, QuestionnaireItem, QuestionnaireResponseItemAnswer, Extension, code, QuestionnaireItemOperator, readI18N, ValueSetComposeIncludeConceptDesignation, Coding} from '@i4mi/fhir_r4';
import { IQuestion, IAnswerOption, IQuestionOptions, ItemControlType } from './IQuestion';

const UNSELECT_OTHERS_EXTENSION = 'http://midata.coop/extensions/valueset-unselect-others';
const ITEM_CONTROL_EXTENSION = 'http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl';
const ITEM_CONTROL_EXTENSION_SYSTEM = 'http://hl7.org/fhir/questionnaire-item-control';
const MIN_VALUE_EXTENSION = 'http://hl7.org/fhir/StructureDefinition/minValue';
const MAX_VALUE_EXTENSION = 'http://hl7.org/fhir/StructureDefinition/maxValue';
const ENTRY_FORMAT_EXTENSION = 'http://hl7.org/fhir/StructureDefinition/entryFormat';
const SLIDER_STEP_VALUE_EXTENSION = 'http://hl7.org/fhir/StructureDefinition/questionnaire-sliderStepValue';
const UNIT_EXTENSION = 'http://hl7.org/fhir/StructureDefinition/questionnaire-unit';
const HIDDEN_EXTENSION = 'http://hl7.org/fhir/StructureDefinition/questionnaire-hidden';
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
                console.warn('Sorry, picking valueAttachment from AnswerOptions is currently not supported.', answerOption);
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

function checkIfDependingQuestionIsEnabled(
    _dependant: IQuestion, 
    _depending: {
        dependingQuestion: IQuestion;
        criteria: {
            answer: QuestionnaireResponseItemAnswer;
            operator: QuestionnaireItemOperator;
        }[];
    },
    _answer: IAnswerOption | undefined
): boolean {
    // we start with true, when undefined or any with false
    let isEnabled = (_dependant.dependingQuestionsEnableBehaviour == QuestionnaireEnableWhenBehavior.ALL);     
    _depending.criteria.forEach(criterium => {

        let evaluatesToTrue = false;
        const crit = criterium.answer.valueCoding?.code ||
            criterium.answer.valueDate ||
            criterium.answer.valueDateTime ||
            criterium.answer.valueTime ||
            criterium.answer.valueDecimal ||
            criterium.answer.valueString ||
            criterium.answer.valueInteger || (
            criterium.answer.valueBoolean == undefined 
                ? undefined 
                : criterium.answer.valueBoolean);
        const answ = _answer?.code.valueCoding?.code ||
            _answer?.code.valueDate ||
            _answer?.code.valueDateTime ||
            _answer?.code.valueDecimal ||
            _answer?.code.valueString ||
            _answer?.code.valueInteger || (
            _answer?.code.valueBoolean == undefined 
                ? undefined 
                : _answer?.code.valueBoolean);
        if (crit != undefined) {
            evaluatesToTrue = evaluateAnswersForDependingQuestion(answ, crit, criterium.operator);
        }

        isEnabled = (_dependant.dependingQuestionsEnableBehaviour == QuestionnaireEnableWhenBehavior.ALL)
                                                            ? (evaluatesToTrue && isEnabled) // only true, when criteria before were true
                                                            : (evaluatesToTrue || isEnabled) // true when evaluates to true or questions before were true
    });
    return isEnabled;
}

/**
* Evaluates a given answer with a criterium and an operator, for enabling and disabling depending questions.
* @param _answer        the given answer, as string (also for code etc) or as a number (when using GE, GT, LE & LT operator)
* @param _criterium     the criterium against which the given answer is compared
* @param _operator      defines if the answer and criterium must be equal or not equal etc.
* @returns              true if answer and criterium match with the given operator, false if not so.
**/
function evaluateAnswersForDependingQuestion(_answer: string | number | boolean | Array<unknown> | undefined, _criterium: string | number | boolean, _operator: QuestionnaireItemOperator): boolean {
    // make sure we have both comparants as number if one is
    if (typeof _answer === 'number' && typeof _criterium !== 'number') {
        _criterium = Number(_criterium);
    } else if (typeof _criterium === 'number' && typeof _answer !== 'number') {
        _answer = Number(_answer);
    }

    switch (_operator) {
        case QuestionnaireItemOperator.EXISTS:
            if (_criterium) {
                return Array.isArray(_answer)
                    ? _answer.length > 0
                    : _answer != undefined;
            } else {
                return Array.isArray(_answer)
                ? _answer.length === 0
                : _answer == undefined;
            }
        case QuestionnaireItemOperator.E:
            return _answer === _criterium;
        case QuestionnaireItemOperator.NE:
            return _answer != _criterium && _answer !== undefined;
        case QuestionnaireItemOperator.GE:
            return _answer == undefined
                ? false
                : _answer >= _criterium;
        case QuestionnaireItemOperator.LE:
            return _answer == undefined
                ? false
                : _answer <= _criterium;
        case QuestionnaireItemOperator.GT:
            return _answer == undefined
                ? false
                : _answer > _criterium;
        case QuestionnaireItemOperator.LT:
            return _answer == undefined
                ? false
                : _answer < _criterium;
        default: return false;
    }
}

/**
 * Recursively iterates through question items to check for completeness
 * @param _question       the question that should be checked for completeness with all its subquestions
 * @param _onlyRequired   parameter that indicates if only questions that are actually are marked 
 *                        as required should be required
* @param   _markInvalid   optional parameter, to specify if not completed questions
*                         should be updated to be invalid (see isInvalid property)
 * @returns               true if the question and all its subquestions are complete
 *                        false if at least one (sub)question is not complete
 */
function recursivelyCheckCompleteness(_question: IQuestion[], _onlyRequired: boolean, _markInvalid: boolean): boolean {
    let isComplete = true;
    _question.forEach((question) => {
        if (isComplete && !question.readOnly && question.isEnabled) {
            if (question.subItems) {
                isComplete = isComplete
                ? recursivelyCheckCompleteness(question.subItems, _onlyRequired, _markInvalid)
                : false;
            }
            if (question.isEnabled && (question.required || !_onlyRequired) && question.type !== QuestionnaireItemType.DISPLAY && question.type !== QuestionnaireItemType.GROUP) {
                isComplete = isComplete
                    ? question.selectedAnswers !== undefined && question.selectedAnswers.length > 0
                    : false;
            }
        }
        // after the first item is not complete, we don't have to look any further
        if (!isComplete) {
            if (_markInvalid) question.isInvalid = true;
            return false;
        }
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
function mapIQuestionToQuestionnaireResponseItem(_question: IQuestion[], _responseItems: QuestionnaireResponseItem[], _language: string): QuestionnaireResponseItem[] {
    _question.forEach((question) => {
        question.isInvalid = false;
        if (question.type === QuestionnaireItemType.GROUP) {
            if (question.subItems && question.subItems.length > 0) {
                _responseItems = mapIQuestionToQuestionnaireResponseItem(question.subItems, _responseItems, _language);
            } else {
                question.isInvalid = true;
                throw new Error(`Invalid question set: IQuestion with id ${question.id} is group type, but has no subItems.`);
            }
        } else if (question.isEnabled){
            // some validation
            if (question.required && question.selectedAnswers.length === 0) {
                question.isInvalid = true;
                throw new Error(`Invalid answer set: IQuestion with id ${question.id} is mandatory, but not answered.`);
            } else if (!question.allowsMultipleAnswers && question.selectedAnswers.length > 1){
                question.isInvalid = true;
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
                    mapIQuestionToQuestionnaireResponseItem(question.subItems, (responseItem as QuestionnaireResponseItem).item || [], _language);
                }
                // add to array
                _responseItems.push(responseItem);
            }

        }
    });
    return _responseItems;
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
function hasExtension(_extensionURL: string, _extensionSystem: string | undefined, _item: QuestionnaireItem): unknown {
    let returnValue: unknown = undefined;
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
                if (extension.valueBoolean != undefined) {
                    returnValue = extension.valueBoolean;
                }
                if (extension.valueDate) {
                    returnValue = extension.valueDate;
                }
                if (extension.valueExpression && extension.valueExpression.language && extension.valueExpression.language=== _extensionSystem) {
                    returnValue = extension.valueExpression;
                }
                return (
                    returnValue != undefined
                        ? returnValue
                        : true
                );
            }
        });
    }

    return returnValue;
}

/**
 * Extracts IQuestionOptions from a QuestionnaireItem
 * @param _FHIRItem     the QuestionnaireItem to extract the options from
 * @returns             an IQuestionOptions object
 */
function setOptionsFromExtensions(_FHIRItem: QuestionnaireItem): IQuestionOptions {
    const itemControlExtension = hasExtension(ITEM_CONTROL_EXTENSION, ITEM_CONTROL_EXTENSION_SYSTEM, _FHIRItem) as undefined | Coding;
    const calculatedExpressionExtension = hasExtension(CALCULATED_EXPRESSION_EXTENSION, 'text/fhirpath', _FHIRItem) as undefined | {expression: string};
    const initialExpressionExtension = hasExtension(INITIAL_EXPRESSION_EXTENSION, 'text/fhirpath', _FHIRItem) as undefined | {expression: string};

    const returnValue: IQuestionOptions = {
        min: hasExtension(MIN_VALUE_EXTENSION, undefined, _FHIRItem) as number | undefined,
        max: hasExtension(MAX_VALUE_EXTENSION, undefined, _FHIRItem) as number | undefined,
        format: hasExtension(ENTRY_FORMAT_EXTENSION, undefined, _FHIRItem) as string | undefined,
        sliderStep: hasExtension(SLIDER_STEP_VALUE_EXTENSION, undefined, _FHIRItem) as number | undefined,
        unit: hasExtension(UNIT_EXTENSION, 'https://ucum.org', _FHIRItem) as Coding | undefined,
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
    availableLanguages: string[];
    lastRestored?: Date;
    responseIdToSynchronize?: string;

    constructor(_questionnaire: Questionnaire, _availableLanguages: string[], _valueSets?: {[url: string]: ValueSet}, _items?: IQuestion[], _hiddenFhirItems?: {item: IQuestion, parentLinkId?: string}[]){
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
     * Returns the storeable data of the object as a string, not including the questionnaire.
     * When rehydrating with a serialized QuestionnaireData string, you can create a new 
     * QuestionnaireData object using the Questionnaire and then call .unserialize() on it, 
     * passing the serialized string
     * @returns a string representing the QuestionnaireData object _without_ containing 
     *              - the fhir Questionnaire
     * @see     unserialize()
     */
    serialize(): string {
        return JSON.stringify({
            valueSets: this.valueSets,
            items: this.items,
            hiddenFhirItems: this.hiddenFhirItems,
            lastRestored: this.lastRestored,
            availableLanguages: this.availableLanguages,
            responseIdToSynchronize: this.responseIdToSynchronize
        });
    }

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
            [url: string]: ValueSet
        };
        items: IQuestion[];
        hiddenFhirItems: {
            item: IQuestion,
            parentLinkId?: string
        }[];
        lastRestored?: Date;
        availableLanguages: string[];
        responseIdToSynchronize?: string;
    }): void {
        const data = typeof _data === 'string'
            ? JSON.parse(_data)
            : _data;
        if (
            !Object.prototype.hasOwnProperty.call(data, 'items')
        ) {
            console.warn('Can not unserialize, passed string seems not to be a serialized QuestionnaireData.', data);
            throw new Error('Can not unserialize, passed string seems not to be a serialized QuestionnaireData.');
        }
        Object.assign(this, data);
        if (this.lastRestored) {
            this.lastRestored = new Date(this.lastRestored);
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

        let questionsDependencies: {id: string, reference?: IQuestion, operator: QuestionnaireItemOperator, answer: unknown}[] = []; // helper array for dependingQuestions

        if (this.fhirQuestionnaire.item) {
            this.filterOutHiddenItems(this.fhirQuestionnaire.item).forEach((item) => {
                // recursively process items
                const currentQuestion = this.mapQuestionnaireItemToIQuestion(item);

                const dependingToQuestions = this.linkDependingQuestions(item, currentQuestion);

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
        _question.isInvalid = false; // assume it is not invalid anymore, until further check
        if (_answer === undefined
           || (_question.type === QuestionnaireItemType.INTEGER && _answer.code.valueInteger == undefined)
           || (_question.type === QuestionnaireItemType.STRING && _answer.code.valueString == '')
           || (_question.type === QuestionnaireItemType.TEXT && _answer.code.valueString == '')
           || (_question.type === QuestionnaireItemType.DATE && _answer.code.valueDate == '')) {
               // remove previous given answers
            _question.selectedAnswers.splice(0,_question.selectedAnswers.length);
        } else {
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
        }

        // we shouldn't have to do this in 2022, but if we don't vite will get confused and break everything
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const that = this;

        _question.dependingQuestions.forEach((dependingQuestion) => {
            dependingQuestion.dependingQuestion.isEnabled = checkIfDependingQuestionIsEnabled(_question, dependingQuestion, _answer);
            // specification says that if an item is not enabled, every subitem is not enabled, 
            // no matter what their own enableWhen says
            if (dependingQuestion.dependingQuestion.isEnabled === false) {
                that.recursivelyDisableSubItems(dependingQuestion.dependingQuestion);
            } else {
                that.recursivelyEnableSubitems(dependingQuestion.dependingQuestion);
            }
        });
    }

    private recursivelyDisableSubItems(subItem: IQuestion): void {
        subItem.isEnabled = false;
        subItem.subItems?.forEach(sI => this.recursivelyDisableSubItems(sI));
    }

    private recursivelyEnableSubitems(subItem: IQuestion): void {
        subItem.isEnabled = true;

        const fhirItem = this.findFhirItem(subItem.id);

        fhirItem?.enableWhen?.forEach(enableWhen => {
            const determinator = this.findQuestionById(enableWhen.question);
            if (determinator) {
                const ewDefinition = determinator.dependingQuestions.find(dq => dq.dependingQuestion.id === subItem.id);
                subItem.isEnabled = checkIfDependingQuestionIsEnabled(determinator, ewDefinition!, {answer: {}, code: determinator.selectedAnswers[0]});
                // TODO: handle this for when parent item is a multiple choice item
            }
        });
        if (subItem.isEnabled) subItem.subItems?.forEach(sI => this.recursivelyEnableSubitems(sI));
    }

    /**
    * Checks if a given IAnswerOption is already sel    ected for a IQuestion.
    * It is checking for the code of the IAnswerOption, not the display string.
    * @param _question     the IQuestion to which the answer belongs
    * @param _answer       the IAnswerOption in question
    **/
    isAnswerOptionSelected(_question: IQuestion, _answer: IAnswerOption): boolean {
        return _question.selectedAnswers.findIndex((selectedAnswer) => {
            return (
                _answer.code.valueBoolean != undefined && selectedAnswer.valueBoolean === _answer.code.valueBoolean ||
                _answer.code.valueDate != undefined && selectedAnswer.valueDate === _answer.code.valueDate ||
                _answer.code.valueDateTime != undefined && selectedAnswer.valueDateTime === _answer.code.valueDateTime ||
                _answer.code.valueDecimal != undefined && selectedAnswer.valueDecimal === _answer.code.valueDecimal ||
                _answer.code.valueInteger != undefined && selectedAnswer.valueInteger === _answer.code.valueInteger ||
                _answer.code.valueQuantity != undefined && (
                    selectedAnswer.valueQuantity?.value === _answer.code.valueQuantity.value && 
                    selectedAnswer.valueQuantity?.system === _answer.code.valueQuantity.system ||
                    selectedAnswer.valueQuantity?.unit === _answer.code.valueQuantity.unit
                ) ||
                _answer.code.valueReference != undefined && selectedAnswer.valueReference === _answer.code.valueReference ||
                _answer.code.valueString != undefined && selectedAnswer.valueString === _answer.code.valueString ||
                _answer.code.valueTime != undefined && selectedAnswer.valueTime === _answer.code.valueTime ||
                _answer.code.valueUri != undefined && selectedAnswer.valueUri === _answer.code.valueUri ||
                _answer.code.valueAttachment != undefined && selectedAnswer.valueAttachment === _answer.code.valueAttachment ||
                _answer.code.valueCoding != undefined && (
                    selectedAnswer.valueCoding?.code === _answer.code.valueCoding.code &&
                    selectedAnswer.valueCoding?.system === _answer.code.valueCoding.system
                )
            );
        }) > -1;
    }

    /**
    * Returns the questionnaire title in a given language. 
    * Falls back to default language of the questionnaire, 
    * if the wanted language is not available.
    * @param _language the language code of the wanted language. 
    **/
    getQuestionnaireTitle(_language: string): string | undefined {
        let title: string | undefined = undefined;
        if (
            this.fhirQuestionnaire._title && 
            this.fhirQuestionnaire._title.extension && 
            this.availableLanguages.includes(_language)
        ) {
            title = readI18N(this.fhirQuestionnaire._title, _language);
        } 
        return title || this.fhirQuestionnaire.title;
    }

    /**
    * Returns the questionnaire description in a given language. 
    * Falls back to default language of the questionnaire, 
    * if the wanted language is not available.
    * @param _language the language code of the wanted language. 
    **/
    getQuestionnaireDescription(_language: string): string | undefined {
        let title: string | undefined = undefined;
        if (
            this.fhirQuestionnaire._description && 
            this.fhirQuestionnaire._description.extension && 
            this.availableLanguages.includes(_language)
        ) {
            title = readI18N(this.fhirQuestionnaire._description, _language);
        } 
        return title || this.fhirQuestionnaire.description;
    }

    /**
    * Processes a QuestionnaireResponse and parses the given answers to the local iQuestion array
    * @param _fhirResponse a QuestionnaireResponse that matches the Questionnaire. If the item array of the
    *                      _fhirResponse is empty, the existing answers will not be overwritten. If the item
    *                      array of the _fhirResponse contains at least one item, the existing answers are all
    *                      overwritten.
    * @throws an error if the questionnaire response is not matching the questionnaire
    **/
    restoreAnswersFromQuestionnaireResponse(_fhirResponse: QuestionnaireResponse): void {
        const questionnaireUrl = _fhirResponse.questionnaire
        ? _fhirResponse.questionnaire.split('|')[0]
        : '';
        if (this.fhirQuestionnaire.url && questionnaireUrl !== this.fhirQuestionnaire.url.split('|')[0]) {
            throw new Error('Invalid argument: QuestionnaireResponse does not match Questionnaire!');
        }
        const answerMatchingIQuestionItemWithFhirResponseItem = (_fhirItems: QuestionnaireResponseItem[]): void => {
            _fhirItems.forEach((answerItem) => {
                const item = this.findQuestionById(answerItem.linkId, this.items);
                if (item) {
                    item.selectedAnswers = [];
                    if (item.answerOptions !== undefined && answerItem.answer) {
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
        if (
            _fhirResponse.item && _fhirResponse.item.length > 0 &&
            (this.lastRestored == undefined || (_fhirResponse.authored && this.lastRestored < new Date(_fhirResponse.authored)))
        ) {
            this.lastRestored = _fhirResponse.authored
                                    ? new Date(_fhirResponse.authored)
                                    : new Date();
            this.responseIdToSynchronize = _fhirResponse.id;
           
            answerMatchingIQuestionItemWithFhirResponseItem(_fhirResponse.item);
        }
    }

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
    *                  - reset:     should the questionnaire be reseted after creating the response (default: false)
    * @returns         a QuestionnaireResponse FHIR resource containing all the answers the user gave
    * @throws          - an error if the QuestionnaireResponse is not valid for the corresponding
    *                  Questionnaire, e.g. when a required answer is missing
    *                  - an error if the _language given is not in the set of available languages
    **/
    getQuestionnaireResponse(
        _language: string, 
        _options?: {
            date?: Date;
            includeID?: boolean;
            patient?: Reference;
            reset?: boolean;
        }
    ): QuestionnaireResponse {
        if (!this.availableLanguages.includes(_language)) {
            throw new Error(
                'getQuestionnaireResponse(): Provided _language (' + 
                _language + 
                ') is not supported by this Questionnaire. (Supported languages: ' + this.availableLanguages + ').');
        }
        const options = _options || {};
        // usual questionnaire response
        const fhirResponse: QuestionnaireResponse = {
            status: this.isResponseComplete() ? QuestionnaireResponseStatus.COMPLETED : QuestionnaireResponseStatus.IN_PROGRESS,
            resourceType: 'QuestionnaireResponse',
            questionnaire: this.getQuestionnaireURLwithVersion(),
            authored: options.date ? options.date.toISOString() : new Date().toISOString(),
            source: options.patient,
            id: options.includeID ? this.responseIdToSynchronize : undefined,
            meta: {},
            item: mapIQuestionToQuestionnaireResponseItem(this.items, new Array<QuestionnaireResponseItem>(),_language)
        }; 
        if (this.fhirQuestionnaire.code) {
            fhirResponse.extension = [{
                url: QUESTIONNAIRERESPONSE_CODING_EXTENSION_URL,
                valueCoding: this.fhirQuestionnaire.code[0]
            }];
        }
        

        // stuff to do for items with calculated expression
        const itemsWithCalculatedExpression = [...this.hiddenFhirItems].filter(i => i.item.options && i.item.options.calculatedExpression !== undefined);
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
                const parentItem = recursivelyFindId(item.parentLinkId, fhirResponse.item!);
                if (parentItem) {
                    if (parentItem.item) {
                        parentItem.item.push(mapIQuestionToQuestionnaireResponseItem([item.item], new Array<QuestionnaireResponseItem>(), _language)[0]);
                    } else {
                        parentItem.item = [mapIQuestionToQuestionnaireResponseItem([item.item], new Array<QuestionnaireResponseItem>(), _language)[0]];
                    }
                }
            } else {
                fhirResponse.item!.push(mapIQuestionToQuestionnaireResponseItem([item.item], new Array<QuestionnaireResponseItem>(), _language)[0]);
            }
        });
        if (options.reset) {
            this.resetResponse();
        }
        return {...fhirResponse};
    }

    /**
    * Returns the questionnaire URL with version number in FHIR canonical format.
    * @return a canonical questionnaire URL, or an empty string if no URL is available
    **/
    getQuestionnaireURLwithVersion(): string {
        if (!this.fhirQuestionnaire.url) return '';
        return this.fhirQuestionnaire.url + ( this.fhirQuestionnaire.version
            ? ('|'+  this.fhirQuestionnaire.version)
            : ''
        );
    }

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
    isResponseComplete(_onlyRequired?: boolean, _markInvalid?: boolean): boolean {
        _onlyRequired = _onlyRequired === true ? true : false;
        _markInvalid = _markInvalid == undefined ? true : _markInvalid;
        return recursivelyCheckCompleteness(this.items, _onlyRequired, _markInvalid);
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
            isInvalid: false,
            initial: _FHIRItem.initial,
            readOnly: _FHIRItem.readOnly ? _FHIRItem.readOnly : false,
            options: setOptionsFromExtensions(_FHIRItem)
        }

        // detect question type
        switch (_FHIRItem.type)  {
            case QuestionnaireItemType.GROUP:
            case QuestionnaireItemType.DISPLAY:
            case QuestionnaireItemType.BOOLEAN:
            case QuestionnaireItemType.DECIMAL:
            case QuestionnaireItemType.INTEGER:
            case QuestionnaireItemType.DATE:
            case QuestionnaireItemType.DATETIME:
            case QuestionnaireItemType.TIME:
            case QuestionnaireItemType.STRING:
            case QuestionnaireItemType.TEXT:
            case QuestionnaireItemType.CHOICE:
            case QuestionnaireItemType.OPEN_CHOICE:
            case QuestionnaireItemType.REFERENCE: 
            case QuestionnaireItemType.ATTACHMENT:
            case QuestionnaireItemType.URL:
            case QuestionnaireItemType.QUANTITY:
                question.type = _FHIRItem.type;
                break;
            default:
                console.warn(`QuestionnaireData.ts: Item type ${_FHIRItem.type} is currently not supported.`)
                //return undefined; // TODO : check this
        }
        const labels = {};
        this.availableLanguages.map(language => {
            labels[language] = _FHIRItem._text 
                ? readI18N(_FHIRItem._text, language) || _FHIRItem.text
                : _FHIRItem.text || '';
        });
        question.label = labels;

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
                    const answerOptionsToUnselect = new Array<{disabler: string, toBeDisabled: string | {mustAllOthersBeDisabled: true}}>();
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
                                answer: concept.designation 
                                    ? this.getTranslationsFromDesignation(concept.designation)
                                    : this.getFallbackTranslationStrings(concept.display || '?'),
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
                            if ((answerPair.toBeDisabled as {mustAllOthersBeDisabled: boolean}).mustAllOthersBeDisabled) {
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
                            }
                        }
                    });

                } else if (_FHIRItem.answerOption) {
                    // check if the valueset has an extension for items unselecting others
                    let unselectOtherExtensions: Extension[];
                    if (_FHIRItem.extension) {
                        unselectOtherExtensions = _FHIRItem.extension.filter((extension) => {
                            return extension.url === UNSELECT_OTHERS_EXTENSION;
                        });
                    }
                    const answerOptionsToUnselect = new Array<{disabler: string, toBeDisabled: string | {mustAllOthersBeDisabled: true}}>();

                    question.answerOptions = _FHIRItem.answerOption.map((answerOption) => {
                        const answerOptionText: {[language: string]: string} = {};
                        this.availableLanguages.forEach(language => {
                            answerOptionText[language] = '';
                        });

                        if (answerOption.valueCoding) {
                            // check if we have multi-language support
                            if (answerOption.valueCoding._display && answerOption.valueCoding._display.extension) {
                                Object.keys(answerOptionText).forEach(key => {
                                    const text = answerOption.valueCoding && answerOption.valueCoding._display
                                        ? readI18N(answerOption.valueCoding?._display, key)
                                        : answerOption.valueCoding?.display;
                                    answerOptionText[key] = text || '';
                                });
                            } else { // when not, use the same text for every language
                                Object.keys(answerOptionText).forEach(key => {
                                    answerOptionText[key] = answerOption.valueCoding?.display || answerOption.valueCoding?.code || '';
                                });
                            }

                            if (unselectOtherExtensions) {
                                // prepare the unselect-others array when an answeroption unselects other options
                                unselectOtherExtensions.forEach((extension) => {
                                    extension = extension.extension
                                                    ? extension.extension[0]
                                                    : {url: ''};
                                    if (answerOption.valueCoding && answerOption.valueCoding && extension.valueCode === answerOption.valueCoding.code && answerOption.valueCoding.code) {
                                        answerOptionsToUnselect.push({
                                            disabler: answerOption.valueCoding.code,
                                            toBeDisabled: {mustAllOthersBeDisabled: true}
                                        });
                                    } else if (answerOption.valueCoding){
                                        if (answerOption.valueCoding.code && extension.valueCode){
                                            answerOptionsToUnselect.push({
                                                disabler: answerOption.valueCoding.code,
                                                toBeDisabled: extension.valueCode
                                            });
                                        }
                                    }
                                });
                            }

                        } else {
                            ['valueString', 'valueDate', 'valueTime', 'valueInteger', 'valueReference'].forEach(valueX => {
                                if (answerOption[valueX]) {
                                    if (answerOption['_' + valueX]) {
                                        Object.keys(answerOptionText).forEach(key => {
                                            const text = readI18N(answerOption['_' + valueX], key);
                                            answerOptionText[key] = text || answerOption[valueX];
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
                    });

                     // now we know all answerOptions, we can link the dependingAnswers from the temp array
                     answerOptionsToUnselect.forEach((answerPair) => {
                        if (question.answerOptions) {
                            const disabler = question.answerOptions.find((answerOption) => {
                                                return answerOption.code.valueCoding && answerOption.code.valueCoding.code === answerPair.disabler;
                                            });
                            let answersToBeDisabled: Array<code> = new Array<code>();
                            if ((answerPair.toBeDisabled as {mustAllOthersBeDisabled: boolean}).mustAllOthersBeDisabled) {
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
                            }
                        }
                    });

                } else { // no answerValueSet available
                    console.warn('CHOICE questiony need answerOptions or an answerValueSet. No embedded answerValueSet found for ' + _FHIRItem.answerValueSet);
                }
            } else if (
                _FHIRItem.type === QuestionnaireItemType.INTEGER || 
                _FHIRItem.type === QuestionnaireItemType.DECIMAL ||
                _FHIRItem.type === QuestionnaireItemType.REFERENCE || 
                _FHIRItem.type === QuestionnaireItemType.DATE ||  
                _FHIRItem.type === QuestionnaireItemType.DATETIME || 
                _FHIRItem.type === QuestionnaireItemType.TIME || 
                _FHIRItem.type === QuestionnaireItemType.TEXT || 
                _FHIRItem.type === QuestionnaireItemType.STRING ||
                _FHIRItem.type === QuestionnaireItemType.BOOLEAN ||
                _FHIRItem.type === QuestionnaireItemType.ATTACHMENT ||
                _FHIRItem.type === QuestionnaireItemType.URL
            ) {
                // these do not need preset answer options, so nothing to do here
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
                    // if (hasExtension(SLIDER_STEP_VALUE_EXTENSION, undefined, _FHIRItem) == undefined) {
                    //     console.warn('QuestionnaireData: Item type QUANTITY is currently only supported with slider extension', _FHIRItem);
                    // }
                }

            } else if (_FHIRItem.type === QuestionnaireItemType.OPEN_CHOICE) {
                // nothing to do
            } else {
                console.warn('QuestionnaireData: Currently items of type ' + _FHIRItem.type +' are not supported!', _FHIRItem);
            }
        }
        return question as IQuestion;
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
        const returnArray = new Array<QuestionnaireItem>();
        JSON.parse(JSON.stringify(_FHIRItems)).forEach((item: QuestionnaireItem) => {
            if (item.item) {
                item.item = this.filterOutHiddenItems(item.item, item);
            }
            const hasHidden = hasExtension(HIDDEN_EXTENSION, undefined, item)
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

    /**
     * 
     * @param _FHIRItem 
     * @param _currentQuestion 
     * @returns                 An array of objects describing the depending questions.
     */
    private linkDependingQuestions(
            _FHIRItem : QuestionnaireItem, 
            _currentQuestion : IQuestion
        ): {
            id: string, 
            reference: IQuestion | undefined, 
            operator: QuestionnaireItemOperator, 
            answer: unknown
        }[]{
        let dependingQuestions = new Array<{id: string, reference: IQuestion | undefined, operator: QuestionnaireItemOperator, answer: unknown}>();

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
                const dependingObject = {
                    id: determinator.question,
                    reference: _currentQuestion,
                    operator: determinator.operator,
                    answer: undefined as QuestionnaireResponseItemAnswer | undefined
                };
                switch(determinator.operator) {
                    case QuestionnaireItemOperator.EXISTS:
                        if (determinator.answerBoolean != undefined) {
                            dependingObject.answer = { valueBoolean: determinator.answerBoolean };
                            const dependant = this.findQuestionById(determinator.question);
                            if (dependant) {
                                _currentQuestion.isEnabled = (dependant.selectedAnswers.length > 0) === determinator.answerBoolean;
                            }
                        } else {
                            console.warn(`QuestionnaireData.ts: Depending questions with operator EXISTS needs answerBoolean (Question ${_FHIRItem.linkId})`);
                        }
                        break;
                    case QuestionnaireItemOperator.NE:
                    case QuestionnaireItemOperator.E:
                        if (determinator.answerString) {
                            dependingObject.answer = { valueString: determinator.answerString };
                        } else if (determinator.answerCoding) {
                            dependingObject.answer = { valueCoding: determinator.answerCoding };
                        } else if (determinator.answerDecimal) {
                            dependingObject.answer = { valueDecimal: determinator.answerDecimal };
                        } else if (determinator.answerInteger) {
                            dependingObject.answer = { valueInteger: determinator.answerInteger };
                        } else if (determinator.answerDate) {
                            dependingObject.answer = { valueDate: determinator.answerDate };
                        } else if (determinator.answerDateTime) {
                            dependingObject.answer = { valueDateTime: determinator.answerDateTime };
                        } else if (determinator.answerTime) {
                            dependingObject.answer = { valueTime: determinator.answerTime };
                        } else if (determinator.answerBoolean != undefined) {
                                dependingObject.answer = { valueBoolean:  determinator.answerBoolean };
                        } else {
                            console.warn(`QuestionnaireData.ts: Currently only answerCoding, answerString, answerDecimal, answerInteger, answerDate, answerDateTime, answerBoolean and answerTime are supported for depending questions with operators "=" and "!=" (Question ${_FHIRItem.linkId})`);
                        }
                        break;
                    case QuestionnaireItemOperator.GT:
                    case QuestionnaireItemOperator.LT:
                    case QuestionnaireItemOperator.GE:
                    case QuestionnaireItemOperator.LE:
                        if (determinator.answerDecimal) {
                            dependingObject.answer = { valueDecimal: determinator.answerDecimal };
                        } else if (determinator.answerInteger) {
                            dependingObject.answer = { valueInteger: determinator.answerInteger };
                        } else if (determinator.answerDate) {
                            dependingObject.answer ={ valueDate: determinator.answerDate };
                        } else if (determinator.answerDateTime) {
                            dependingObject.answer = { valueDateTime: determinator.answerDateTime };
                        } else if (determinator.answerTime) {
                            dependingObject.answer = { valueTime: determinator.answerTime };
                        } else {
                            console.warn(`QuestionnaireData.ts: Currently only answerDecimal, answerInteger, answerDate, answerDateTime and answerTime are supported for depending questions with operators "<", ">", ">=" and ">=" (Question ${_FHIRItem.linkId})`);
                        }
                        break;
                }
                if (dependingObject.answer) {
                    dependingQuestions.push(dependingObject);
                }
            });
        }
        return dependingQuestions;
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
        const resources = {};
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
                            const cleanExpression = expression.replace(new RegExp('%' + type + '.', 'g'), '');
                            const value = fhirpath.evaluate(resource, cleanExpression)[0];
                            if (value != undefined) {
                                let populatedAnswer: IAnswerOption = { answer: {}, code: {} };
                                this.availableLanguages.forEach(l => {
                                    populatedAnswer.answer[l] = value;
                                });
                                
                                switch(item.type) {
                                    case QuestionnaireItemType.CHOICE:
                                        populatedAnswer = this.findAccordingAnswerOption(value, item.answerOptions) || populatedAnswer;
                                        break;
                                    case QuestionnaireItemType.STRING:
                                    case QuestionnaireItemType.TEXT:
                                        populatedAnswer.code.valueString = value.toString();
                                        break;
                                    case QuestionnaireItemType.INTEGER:
                                        populatedAnswer.code.valueInteger = Number(value);
                                        break;
                                    case QuestionnaireItemType.BOOLEAN:
                                        populatedAnswer.code.valueBoolean = typeof value === 'string'
                                            ? value.toLowerCase() === 'true'
                                            : value;
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
                                        console.warn('Population of items of type' + item.type + ' is currently not supported by QuestionnaireData. Please inform the developer or create an issue on Github with specifying the missing type.');
                                }
                                if (Object.keys(populatedAnswer.code).length > 0) {
                                    this.updateQuestionAnswers(item, populatedAnswer);
                                }
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
    * Recursively searches for a IQuestion by ID. This is useful if a Questionnaires questions
    * are nested on multiple layers.
    * @param _id    the id of the IQuestion to find
    * @param _data? the (nested) array of IQuestion to search in. If no data is provided, search is
    *               performed over all questions of the QuestionnaireData  
    */
    findQuestionById(_id: string, _data: IQuestion[] = this.getQuestions()): IQuestion | undefined {
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

    /**
     * Gets translations from designation like in an embedded valueset.
     * @param languageDesignations  the designations from the valueset
     * @returns                     an object key/value pair with the languages
     *                              and the matching strings
     */
    private getTranslationsFromDesignation(languageDesignations: ValueSetComposeIncludeConceptDesignation[]): {[language: string]: string} {
        const translations: {[language: string]: string} = {};
        Array.prototype.forEach.call(languageDesignations, (designation: { language: string; value: string; }) => {
            translations[designation.language] = designation.value;
        })
        return translations;
    }

    /**
     * Creates a fallback I18N object with a string for when no I18N is available. All available languages will have 
     * the same, fallback, translation string
     * @param _text     the fallback string
     * @returns         an object key/value pair with each available language having set the translation string 
     */
     private getFallbackTranslationStrings(_text: string): {[lang: string]: string} {
        const returnObject: {[lang: string]: string} = {};
        this.availableLanguages.forEach((lang) => {
            returnObject[lang] = _text;
        });
        return returnObject;
    }

    /**
     * Searches for the QuestionnaireItem in the FHIR Questionnaire
     * @param id        the id of the item to find
     * @param subItems  optional (for recursivitiy): an array to search in
     * @returns         the QuestionnaireItem, or undefined if no item can be found
     */
     private findFhirItem(id: string, subItems?: QuestionnaireItem[]): QuestionnaireItem | undefined {
        let found: QuestionnaireItem | undefined;
        const searchArray = subItems || this.fhirQuestionnaire.item;
        searchArray?.forEach(item => {
            if (!found) {
                if (item.linkId === id) {
                    found = item;
                }
                if (item.item) {
                    found = this.findFhirItem(id, item.item);
                }
            }
        });
        return found;
    }
}