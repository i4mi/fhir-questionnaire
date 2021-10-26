"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var moment_1 = require("moment");
var fhirpath_1 = require("fhirpath");
var fhir_r4_1 = require("@i4mi/fhir_r4");
var IQuestion_1 = require("./IQuestion");
var UNSELECT_OTHERS_EXTENSION = "http://midata.coop/extensions/valueset-unselect-others";
var ITEM_CONTROL_EXTENSION = 'http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl';
var ITEM_CONTROL_EXTENSION_SYSTEM = 'http://hl7.org/fhir/questionnaire-item-control';
var MIN_VALUE_EXTENSION = 'http://hl7.org/fhir/StructureDefinition/minValue';
var MAX_VALUE_EXTENSION = 'http://hl7.org/fhir/StructureDefinition/maxValue';
var ENTRY_FORMAT_EXTENSION = 'http://hl7.org/fhir/StructureDefinition/entryFormat';
var SLIDER_STEP_VALUE_EXTENSION = 'http://hl7.org/fhir/StructureDefinition/questionnaire-sliderStepValue';
var UNIT_EXTENSION = 'http://hl7.org/fhir/StructureDefinition/questionnaire-unit';
var HIDDEN_EXTENSION = "http://hl7.org/fhir/StructureDefinition/questionnaire-hidden";
var CALCULATED_EXPRESSION_EXTENSION = 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-calculatedExpression';
var QUESTIONNAIRERESPONSE_CODING_EXTENSION_URL = 'http://midata.coop/extensions/response-code';
var QuestionnaireData = /** @class */ (function () {
    function QuestionnaireData(_questionnaire, _availableLanguages, _valueSets, _items, _hiddenFhirItems) {
        var _this = this;
        this.fhirQuestionnaire = _questionnaire;
        this.items = new Array();
        this.hiddenFhirItems = new Array();
        this.availableLanguages = _availableLanguages || [];
        this.valueSets = {};
        if (_valueSets) {
            this.valueSets = _valueSets;
        }
        else if (this.fhirQuestionnaire.contained) {
            // process contained valuesets
            // TODO: prepare for not contained valuesets
            this.fhirQuestionnaire.contained.forEach(function (resource) {
                if (resource.resourceType === 'ValueSet') {
                    var valueSet = resource;
                    if (valueSet.id) {
                        _this.valueSets[valueSet.id] = valueSet;
                    }
                }
            });
        }
        if (_items) {
            this.items = _items;
            this.hiddenFhirItems = _hiddenFhirItems
                ? _hiddenFhirItems
                : [];
        }
        else {
            this.items = new Array();
            this.resetResponse();
        }
    }
    /**
    * Resets the response to the questionnaire
    **/
    QuestionnaireData.prototype.resetResponse = function () {
        var _this = this;
        if (this.items.length > 0) {
            this.items = new Array();
        }
        this.hiddenFhirItems = new Array();
        var questionsDependencies = []; // helper array for dependingQuestions
        if (this.fhirQuestionnaire.item) {
            this.filterOutHiddenItems(this.fhirQuestionnaire.item).forEach(function (item) {
                // recursively process items
                var currentQuestion = _this.mapQuestionnaireItemToIQuestion(item);
                var dependingToQuestions = _this.linkDependingQuestions(item, currentQuestion);
                if (dependingToQuestions.length > 0) {
                    questionsDependencies = questionsDependencies.concat(dependingToQuestions);
                }
                _this.items.push(currentQuestion);
            });
            // now we stepped through all the items and the helper array is complete, we can add depending questions to their determinators
            questionsDependencies.forEach(function (question) {
                var determinator = _this.findQuestionById(question.id, _this.items);
                if (question.reference && determinator) {
                    determinator.dependingQuestions.push({
                        dependingQuestion: question.reference,
                        answer: question.answer
                    });
                }
            });
        }
    };
    /**
    * Returns the questions array.
    **/
    QuestionnaireData.prototype.getQuestions = function () {
        return this.items;
    };
    /**
     * Updates the selected answer(s) of a question: adds the answer if it's not already selected
     * and removes it, if it was selected.
     * @param _question     the IQuestion to which the answer belongs
     * @param _answer       the selected / unselected QuestionnaireItemAnswerOption
     **/
    QuestionnaireData.prototype.updateQuestionAnswers = function (_question, _answer) {
        if (_answer === undefined
            || (_question.type === fhir_r4_1.QuestionnaireItemType.INTEGER && _answer.code.valueInteger == undefined)
            || (_question.type === fhir_r4_1.QuestionnaireItemType.STRING && _answer.code.valueString == '')
            || (_question.type === fhir_r4_1.QuestionnaireItemType.DATE && _answer.code.valueDate == '')) {
            // remove previous given answers
            _question.selectedAnswers.splice(0, _question.selectedAnswers.length);
            _question.dependingQuestions.forEach(function (dependingQuestion) {
                dependingQuestion.dependingQuestion.isEnabled = false;
            });
            return;
        }
        var indexOfAnswer = _question.selectedAnswers.indexOf(_answer.code);
        if (_question.allowsMultipleAnswers) {
            // check if item is already selected
            if (indexOfAnswer >= 0) { // answer is already selected
                _question.selectedAnswers.splice(indexOfAnswer, 1); // remove answer
            }
            else {
                // if not already selected, we select it now
                _question.selectedAnswers.push(_answer.code);
                // and disable other answers when necessary
                if (_answer.disableOtherAnswers) {
                    _answer.disableOtherAnswers.forEach(function (otherAnswer) {
                        var indexOfOtherAnswer = _question.selectedAnswers.findIndex(function (selectedAnswer) {
                            return selectedAnswer.valueCoding
                                ? selectedAnswer.valueCoding.code === otherAnswer
                                : undefined;
                        });
                        if (indexOfOtherAnswer >= 0) { // otherAnswer is selected
                            _question.selectedAnswers.splice(indexOfOtherAnswer, 1); // remove otherAnswer)
                        } // no else needed, because we don't have to unselect already unselected answers
                    });
                }
            }
        }
        else {
            if (indexOfAnswer < 0) {
                _question.selectedAnswers[0] = _answer.code;
            }
        }
        // update depending questions
        _question.dependingQuestions.forEach(function (dependingQuestion) {
            if (!dependingQuestion.answer.valueCoding || !_answer.code.valueCoding) {
                dependingQuestion.dependingQuestion.isEnabled = false;
            }
            else {
                dependingQuestion.dependingQuestion.isEnabled = (_answer.code.valueCoding && dependingQuestion.answer.valueCoding.code === _answer.code.valueCoding.code && indexOfAnswer < 0);
            }
        });
    };
    /**
    * Checks if a given IAnswerOption is already selected for a IQuestion.
    * @param _question     the IQuestion to which the answer belongs
    * @param _answer       the IAnswerOption in question
    **/
    QuestionnaireData.prototype.isAnswerOptionSelected = function (_question, _answer) {
        return _question.selectedAnswers.findIndex(function (selectedAnswer) {
            return JSON.stringify(selectedAnswer) == JSON.stringify(_answer.code);
        }) > -1;
    };
    /**
    * Returns the questionnaire title in a given language.
    * @param _language the language code of the wanted language
    **/
    QuestionnaireData.prototype.getQuestionnaireTitle = function (_language) {
        if (this.fhirQuestionnaire._title && this.fhirQuestionnaire._title.extension) {
            return this.getTranslationsFromExtension(this.fhirQuestionnaire._title)[_language];
        }
        else {
            return undefined;
        }
    };
    /**
    * Processes a QuestionnaireResponse and parses the given answers to the local iQuestion array
    * @param _fhirResponse a QuestionnaireResponse that matches the Questionnaire
    * @throws an error if the questionnaire response is not matching the questionnaire
    **/
    QuestionnaireData.prototype.restoreAnswersFromQuestionnaireResponse = function (_fhirResponse) {
        var _this = this;
        // only restore, if it is not already up to date
        if (this.lastRestored == undefined || moment_1.default(this.lastRestored).isBefore(_fhirResponse.authored)) {
            this.lastRestored = _fhirResponse.authored;
            this.responseIdToSynchronize = _fhirResponse.id;
            var questionnaireUrl = _fhirResponse.questionnaire
                ? _fhirResponse.questionnaire.split('|')[0]
                : '';
            if (this.fhirQuestionnaire.url && questionnaireUrl !== this.fhirQuestionnaire.url.split('|')[0]) {
                throw new Error('Invalid argument: QuestionnaireResponse does not match Questionnaire!');
            }
            if (_fhirResponse.item) {
                _fhirResponse.item.forEach(function (answerItem) {
                    var item = _this.findQuestionById(answerItem.linkId, _this.items);
                    if (item) {
                        item.selectedAnswers = [];
                        if (item.answerOptions && item.answerOptions.length > 0 && answerItem.answer) {
                            answerItem.answer.forEach(function (answer) {
                                var answerAsAnswerOption = item.answerOptions.find(function (answerOption) {
                                    if (answer.valueCoding && answerOption.code.valueCoding) {
                                        return answer.valueCoding.system === answerOption.code.valueCoding.system
                                            ? answer.valueCoding.code === answerOption.code.valueCoding.code
                                            : false;
                                    }
                                    else if (answer.valueString) {
                                        return answer.valueString === answerOption.code.valueString;
                                    }
                                    else if (answer.valueInteger) {
                                        return answer.valueInteger === answerOption.code.valueInteger;
                                    }
                                    else if (answer.valueDate) {
                                        return answer.valueDate === answerOption.code.valueDate;
                                    }
                                    else if (answer.valueQuantity) {
                                        return answer.valueQuantity === answerOption.code.valueQuantity;
                                    }
                                    else if (answer.valueDateTime) {
                                        return answer.valueDateTime === answerOption.code.valueDateTime;
                                    }
                                    else if (answer.valueBoolean) {
                                        return answer.valueBoolean === answerOption.code.valueBoolean;
                                    }
                                    else if (answer.valueDecimal) {
                                        return answer.valueDecimal === answerOption.code.valueDecimal;
                                    }
                                    else if (answer.valueTime) {
                                        return answer.valueTime === answerOption.code.valueTime;
                                    }
                                    else if (answer.valueUri) {
                                        return answer.valueUri === answerOption.code.valueUri;
                                    }
                                    else if (answer.valueReference) {
                                        return answer.valueReference === answerOption.code.valueReference;
                                    }
                                    else if (answer.valueAttachment) {
                                        return answer.valueReference === answerOption.code.valueAttachment;
                                    }
                                    else {
                                        //TODO: other answer types
                                        console.warn('Answer has unknown type', answerOption.code);
                                        return false;
                                    }
                                });
                                if (answerAsAnswerOption) {
                                    item.selectedAnswers.push(answerAsAnswerOption.code);
                                }
                                else {
                                    item.selectedAnswers = answerItem.answer
                                        ? answerItem.answer
                                        : [];
                                }
                            });
                        }
                        else if (answerItem.answer && answerItem.answer.length > 0) {
                            if (item.allowsMultipleAnswers) {
                                item.selectedAnswers = answerItem.answer;
                            }
                            else {
                                item.selectedAnswers.push(answerItem.answer[0]);
                            }
                        }
                    }
                    else {
                        console.warn('Item with linkId ' + answerItem.linkId + ' was found in QuestionnaireResponse, but does not exist in Questionnaire.');
                    }
                });
            }
        }
    };
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
    QuestionnaireData.prototype.getQuestionnaireResponse = function (_language, _patient, _date, _includeID) {
        var _this = this;
        // usual questionnaire response
        var fhirResponse = {
            status: this.isResponseComplete() ? fhir_r4_1.QuestionnaireResponseStatus.COMPLETED : fhir_r4_1.QuestionnaireResponseStatus.IN_PROGRESS,
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
            item: this.mapIQuestionToQuestionnaireResponseItem(this.items, new Array(), _language)
        };
        // stuff to do for items with calculated expression
        var itemsWithCalculatedExpression = this.hiddenFhirItems.filter(function (i) { return i.item.options && i.item.options.calculatedExpression !== undefined; });
        itemsWithCalculatedExpression.forEach(function (item) {
            if (item.item.options) {
                try {
                    var calculatedAnswer = { valueDecimal: fhirpath_1.default.evaluate(fhirResponse, item.item.options.calculatedExpression) };
                    if (item.item.allowsMultipleAnswers) {
                        item.item.selectedAnswers.push(calculatedAnswer);
                    }
                    else {
                        item.item.selectedAnswers = [calculatedAnswer];
                    }
                }
                catch (e) {
                    throw new Error('Can not evaluate fhirpath expression for item ' + item.item.id + ': ' + item.item.options.calculatedExpression + '.');
                }
            }
            if (item.parentLinkId) {
                var recursivelyFindId_1 = function (id, items) {
                    var itemWithId;
                    items.forEach(function (i) {
                        if (!itemWithId) {
                            if (i.linkId === id) {
                                itemWithId = i;
                            }
                            else if (i.item) {
                                itemWithId = recursivelyFindId_1(id, i.item);
                            }
                        }
                    });
                    return itemWithId;
                };
                var parentItem = recursivelyFindId_1(item.parentLinkId, fhirResponse.item);
                if (parentItem) {
                    if (parentItem.item) {
                        parentItem.item.push(_this.mapIQuestionToQuestionnaireResponseItem([item.item], new Array(), _language)[0]);
                    }
                    else {
                        parentItem.item = [_this.mapIQuestionToQuestionnaireResponseItem([item.item], new Array(), _language)[0]];
                    }
                }
            }
            else {
                fhirResponse.item.push(_this.mapIQuestionToQuestionnaireResponseItem([item.item], new Array(), _language)[0]);
            }
        });
        return fhirResponse;
    };
    /**
    * Returns the questionnaire URL with version number in FHIR canonical format.
    * @return a canonical questionnaire URL
    **/
    QuestionnaireData.prototype.getQuestionnaireURLwithVersion = function () {
        return this.fhirQuestionnaire.url + (this.fhirQuestionnaire.version
            ? ('|' + this.fhirQuestionnaire.version)
            : '');
    };
    /**
    * Checks a QuestionnaireResponse for completeness.
    * @param   onlyRequired optional parameter, to specify if only questions with
    the required attribute need to be answered or all questions;
    default value is: false
    * @returns true if all questions are answered
    *          false if at least one answer is not answered
    */
    QuestionnaireData.prototype.isResponseComplete = function (_onlyRequired) {
        _onlyRequired = _onlyRequired === true ? true : false;
        return this.recursivelyCheckCompleteness(this.items, _onlyRequired);
    };
    QuestionnaireData.prototype.recursivelyCheckCompleteness = function (_question, _onlyRequired) {
        var _this = this;
        var isComplete = true;
        _question.forEach(function (question) {
            if (question.type === 'group' && question.subItems) {
                isComplete = isComplete
                    ? _this.recursivelyCheckCompleteness(question.subItems, _onlyRequired)
                    : false;
            }
            else if (question.readOnly) {
                // do nothing
            }
            else {
                if (question.required || !_onlyRequired) {
                    isComplete = isComplete
                        ? question.selectedAnswers && question.selectedAnswers.length > 0
                        : false;
                }
            }
            // after the first item is not complete, we don't have to look any further
            if (!isComplete)
                return false;
        });
        return isComplete;
    };
    /**
    * Recursively iterates through nested IQuestions and extracts the given answers and adds
    * it to a given array as FHIR QuestionnaireResponseItem
    * @param question      an array of (possibly nested) IQuestions
    * @param responseItems the array to fill with the FHIR QuestionnaireResponseItems
    * @returns             the given array
    * @throws              an error if answers are not valid
    **/
    QuestionnaireData.prototype.mapIQuestionToQuestionnaireResponseItem = function (_question, _responseItems, _language) {
        var _this = this;
        _question.forEach(function (question) {
            if (question.type === fhir_r4_1.QuestionnaireItemType.GROUP) {
                if (question.subItems && question.subItems.length > 0) {
                    _responseItems = _this.mapIQuestionToQuestionnaireResponseItem(question.subItems, _responseItems, _language);
                }
                else {
                    throw new Error("Invalid question set: IQuestion with id " + question.id + " is group type, but has no subItems.");
                }
            }
            else if (question.isEnabled) {
                // some validation
                if (question.required && question.selectedAnswers.length === 0) {
                    throw new Error("Invalid answer set: IQuestion with id " + question.id + " is mandatory, but not answered.");
                }
                else if (!question.allowsMultipleAnswers && question.selectedAnswers.length > 1) {
                    throw new Error("Invalid answer set: IQuestion with id " + question.id + " allows only one answer, but has more.");
                }
                else {
                    var responseItem_1 = {
                        linkId: question.id,
                        text: question.label[_language],
                        answer: new Array()
                    };
                    question.selectedAnswers.forEach(function (answer) {
                        if (answer.valueCoding) {
                            // find translated display for answer valueCoding
                            var answerDisplayAllLanguages = (question.answerOptions.find(function (answerOption) {
                                return answerOption.code.valueCoding && answer.valueCoding && answerOption.code.valueCoding.code === answer.valueCoding.code;
                            }) || { answer: '' }).answer;
                            // some answer options (e.g. zip code locations) have only one language set
                            var answerDisplay = answerDisplayAllLanguages
                                ? answerDisplayAllLanguages[_language]
                                    ? answerDisplayAllLanguages[_language]
                                    : answerDisplayAllLanguages[Object.keys(answerDisplayAllLanguages)[0]]
                                : '';
                            responseItem_1.answer.push({
                                valueCoding: {
                                    system: answer.valueCoding.system,
                                    code: answer.valueCoding.code,
                                    display: answerDisplay,
                                    extension: answer.valueCoding.extension
                                }
                            });
                        }
                        else {
                            responseItem_1.answer.push(answer);
                        }
                    });
                    if (question.subItems && question.subItems.length > 0) {
                        responseItem_1.item = [];
                        _this.mapIQuestionToQuestionnaireResponseItem(question.subItems, responseItem_1.item || [], _language);
                    }
                    // add to array
                    _responseItems.push(responseItem_1);
                }
            }
        });
        return _responseItems;
    };
    /**
    * recursively iterates through a possibly nested QuestionnaireItem and maps it to IQuestion objects.
    * @param _FHIRItem the QuestionnaireItem to start with
    */
    QuestionnaireData.prototype.mapQuestionnaireItemToIQuestion = function (_FHIRItem) {
        var _this = this;
        var question = {
            id: _FHIRItem.linkId ? _FHIRItem.linkId : '',
            required: _FHIRItem.required || false,
            prefix: _FHIRItem.prefix,
            allowsMultipleAnswers: _FHIRItem.repeats,
            answerOptions: new Array(),
            selectedAnswers: Array(),
            dependingQuestions: [],
            isEnabled: true,
            readOnly: _FHIRItem.readOnly ? _FHIRItem.readOnly : false,
            options: this.setOptionsFromExtensions(_FHIRItem)
        };
        // detect question type
        switch (_FHIRItem.type) {
            case fhir_r4_1.QuestionnaireItemType.GROUP:
            case fhir_r4_1.QuestionnaireItemType.CHOICE:
            case fhir_r4_1.QuestionnaireItemType.INTEGER:
            case fhir_r4_1.QuestionnaireItemType.STRING:
            case fhir_r4_1.QuestionnaireItemType.DISPLAY:
            case fhir_r4_1.QuestionnaireItemType.QUANTITY:
            case fhir_r4_1.QuestionnaireItemType.DATE:
            case fhir_r4_1.QuestionnaireItemType.OPEN_CHOICE:
                question.type = _FHIRItem.type;
                break;
            default:
                console.warn("QuestionnaireData.ts: Item type " + _FHIRItem.type + " is currently not supported.");
            //return undefined; // TODO : check this
        }
        question.label = this.getTranslationsFromExtension(_FHIRItem._text);
        // first handle group items with subitems
        if (_FHIRItem.item && _FHIRItem.item.length > 0) {
            question.subItems = new Array();
            _FHIRItem.item.forEach(function (subItem) {
                if (question.subItems) {
                    question.subItems.push(_this.mapQuestionnaireItemToIQuestion(subItem));
                }
            });
        }
        // handle the non-group items
        if (_FHIRItem.type !== fhir_r4_1.QuestionnaireItemType.GROUP) {
            if (_FHIRItem.readOnly && _FHIRItem.code) {
                question.options = question.options || {};
                _FHIRItem.code.forEach(function (code) {
                    if (code.code && code.system === 'http://snomed.info/sct' && question.options) {
                        question.options.populateType = IQuestion_1.PopulateType[code.code];
                    }
                });
            }
            if (_FHIRItem.type === fhir_r4_1.QuestionnaireItemType.CHOICE) {
                // process answer options from ValueSet
                if (_FHIRItem.answerValueSet && _FHIRItem.answerValueSet.indexOf('#') >= 0) { // these are the "contained valuesets"
                    var answerOptionsToUnselect_1 = new Array();
                    var answerValueSet_1 = this.valueSets[_FHIRItem.answerValueSet.split('#')[1]];
                    // check if the valueset has an extension for items unselecting others
                    var unselectOtherExtensions_1;
                    if (_FHIRItem.extension) {
                        unselectOtherExtensions_1 = _FHIRItem.extension.filter(function (extension) {
                            return extension.url === UNSELECT_OTHERS_EXTENSION;
                        });
                    }
                    if (answerValueSet_1.compose && answerValueSet_1.compose.include[0].concept) {
                        var system_1 = answerValueSet_1.compose.include[0].system;
                        answerValueSet_1.compose.include[0].concept.forEach(function (concept) {
                            // build answerOption objects with translations
                            var answerOption = {
                                answer: _this.getTranslationsFromDesignation(concept.designation),
                                code: {
                                    valueCoding: {
                                        system: system_1
                                            ? system_1
                                            : answerValueSet_1.url,
                                        code: concept.code
                                    }
                                }
                            };
                            if (unselectOtherExtensions_1) {
                                // prepare the unselect-others array when an answeroption unselects other options
                                unselectOtherExtensions_1.forEach(function (extension) {
                                    extension = extension.extension
                                        ? extension.extension[0]
                                        : { url: '' };
                                    if (answerOption.code.valueCoding && answerOption.code.valueCoding && extension.valueCode === answerOption.code.valueCoding.code && answerOption.code.valueCoding.code) {
                                        answerOptionsToUnselect_1.push({
                                            disabler: answerOption.code.valueCoding.code,
                                            toBeDisabled: { mustAllOthersBeDisabled: true }
                                        });
                                    }
                                    else if (answerOption.code.valueCoding) {
                                        if (answerOption.code.valueCoding.code && extension.valueCode) {
                                            answerOptionsToUnselect_1.push({
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
                    answerOptionsToUnselect_1.forEach(function (answerPair) {
                        if (question.answerOptions) {
                            var disabler = question.answerOptions.find(function (answerOption) {
                                return answerOption.code.valueCoding && answerOption.code.valueCoding.code === answerPair.disabler;
                            });
                            var answersToBeDisabled_1 = new Array();
                            if (answerPair.toBeDisabled == { mustAllOthersBeDisabled: true }) {
                                // add all but the disabler option to array
                                question.answerOptions.map(function (answerOption) {
                                    if (answerOption.code.valueCoding && answerOption.code.valueCoding.code && answerOption.code.valueCoding.code !== answerPair.disabler) {
                                        answersToBeDisabled_1.push(answerOption.code.valueCoding.code);
                                    }
                                });
                            }
                            else {
                                answersToBeDisabled_1 = new Array();
                                // find the link to the disabled question
                                var disabledQuestion = question.answerOptions.find(function (answerOption) {
                                    return answerOption.code.valueCoding
                                        ? answerOption.code.valueCoding.code === answerPair.toBeDisabled
                                        : false;
                                });
                                if (disabledQuestion && disabledQuestion.code.valueCoding && disabledQuestion.code.valueCoding.code) {
                                    answersToBeDisabled_1.push(disabledQuestion.code.valueCoding.code);
                                }
                            }
                            // finally assign the to be disabled questions to the disabler
                            if (disabler) {
                                disabler.disableOtherAnswers = answersToBeDisabled_1;
                            }
                            ;
                        }
                    });
                }
                else if (_FHIRItem.answerOption) {
                    question.answerOptions = _FHIRItem.answerOption.map(function (answerOption) {
                        var answerOptionText = {};
                        _this.availableLanguages.forEach(function (language) {
                            answerOptionText[language] = '';
                        });
                        if (answerOption.valueCoding) {
                            // check if we have multi-language support
                            if (answerOption.valueCoding._display && answerOption.valueCoding._display.extension) {
                                Object.keys(answerOptionText).forEach(function (key) {
                                    answerOptionText[key] = _this.getTranslationsFromExtension(answerOption.valueCoding._display)[key];
                                });
                            }
                            else { // when not, use the same text for every language
                                Object.keys(answerOptionText).forEach(function (key) {
                                    answerOptionText[key] = answerOption.valueCoding.display || '';
                                });
                            }
                        }
                        else {
                            ['valueString', 'valueDate', 'valueTime', 'valueInteger', 'valueReference'].forEach(function (valueX) {
                                if (answerOption[valueX]) {
                                    if (answerOption['_' + valueX]) {
                                        Object.keys(answerOptionText).forEach(function (key) {
                                            answerOptionText[key] = _this.getTranslationsFromExtension(answerOption['_' + valueX])[key];
                                        });
                                    }
                                    else {
                                        Object.keys(answerOptionText).forEach(function (key) {
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
                }
                else { // no answerValueSet available
                    console.warn('CHOICE questiony need answerOptions or an answerValueSet. No embedded answerValueSet found for ' + _FHIRItem.answerValueSet);
                }
            }
            else if (_FHIRItem.type === fhir_r4_1.QuestionnaireItemType.INTEGER || _FHIRItem.type === fhir_r4_1.QuestionnaireItemType.STRING) {
                // TODO: really nothing to do here?
            }
            else if (_FHIRItem.type === fhir_r4_1.QuestionnaireItemType.DISPLAY) {
                question.readOnly = true;
            }
            else if (_FHIRItem.type === fhir_r4_1.QuestionnaireItemType.QUANTITY) {
                if (question.options && question.options.controlType == IQuestion_1.ItemControlType.SLIDER && question.options.min && question.options.max) {
                    question.answerOptions = [
                        {
                            answer: {
                                // TODO: make dynamic
                                de: 'Wert mit Slider ausgewählt ($MIN$ - $MAX$)'.replace('$MIN$', question.options.min.toString()).replace('$MAX$', question.options.max.toString()),
                                fr: 'Valeur sélectionnée avec le slider ($MIN$ - $MAX$)'.replace('$MIN$', question.options.min.toString()).replace('$MAX$', question.options.max.toString())
                            },
                            code: {
                                valueQuantity: question.options.unit
                                    ? {
                                        value: undefined,
                                        system: question.options.unit.system,
                                        unit: question.options.unit.display,
                                        code: question.options.unit.code
                                    }
                                    : {}
                            }
                        }
                    ];
                }
                else {
                    console.warn('QuestionnaireData: Item type QUANTITY is currently only supported with slider extension', _FHIRItem);
                }
            }
            else if (_FHIRItem.type === fhir_r4_1.QuestionnaireItemType.DATE) {
                // nothing to do
            }
            else if (_FHIRItem.type === fhir_r4_1.QuestionnaireItemType.OPEN_CHOICE) {
                // nothing to do
            }
            else {
                // TODO: implement other answerOptions
                console.warn('QuestionnaireData: Currently only items of type CHOICE, INTEGER, STRING, QUANTITY, DATE, OPEN_CHOICE or DISPLAY are supported.', _FHIRItem);
            }
        }
        return question;
    };
    QuestionnaireData.prototype.setOptionsFromExtensions = function (_FHIRItem) {
        var itemControlExtension = this.hasExtension(ITEM_CONTROL_EXTENSION, ITEM_CONTROL_EXTENSION_SYSTEM, _FHIRItem);
        var returnValue = {
            min: this.hasExtension(MIN_VALUE_EXTENSION, undefined, _FHIRItem),
            max: this.hasExtension(MAX_VALUE_EXTENSION, undefined, _FHIRItem),
            format: this.hasExtension(ENTRY_FORMAT_EXTENSION, undefined, _FHIRItem),
            sliderStep: this.hasExtension(SLIDER_STEP_VALUE_EXTENSION, undefined, _FHIRItem),
            unit: this.hasExtension(UNIT_EXTENSION, 'https://ucum.org', _FHIRItem),
            calculatedExpression: this.hasExtension(CALCULATED_EXPRESSION_EXTENSION, 'text/fhirpath', _FHIRItem).expression
        };
        if (itemControlExtension) {
            Object.values(IQuestion_1.ItemControlType).forEach(function (typeCode) {
                if (!returnValue.controlType && itemControlExtension.code === typeCode) {
                    returnValue.controlType = typeCode;
                }
            });
        }
        return returnValue;
    };
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
    QuestionnaireData.prototype.filterOutHiddenItems = function (_FHIRItems, _parent) {
        var _this = this;
        var returnArray = new Array();
        JSON.parse(JSON.stringify(_FHIRItems)).forEach(function (item) {
            if (item.item) {
                item.item = _this.filterOutHiddenItems(item.item, item);
            }
            var hasHidden = _this.hasExtension(HIDDEN_EXTENSION, undefined, item);
            if (hasHidden) {
                _this.hiddenFhirItems.push({
                    item: _this.mapQuestionnaireItemToIQuestion(item),
                    parentLinkId: _parent ? _parent.linkId : undefined
                });
            }
            else {
                returnArray.push(item);
            }
        });
        return returnArray;
    };
    QuestionnaireData.prototype.linkDependingQuestions = function (_FHIRItem, _currentQuestion) {
        var _this = this;
        var dependingQuestions = new Array();
        if (_FHIRItem.item && _FHIRItem.item.length > 0) {
            _FHIRItem.item.forEach(function (item, index) {
                if (_currentQuestion.subItems) {
                    dependingQuestions = dependingQuestions.concat(_this.linkDependingQuestions(item, _currentQuestion.subItems[index]));
                }
            });
        }
        // prepare helper array for dependent questions
        if (_FHIRItem.enableWhen) {
            _currentQuestion.isEnabled = false;
            _FHIRItem.enableWhen.forEach(function (determinator) {
                if (determinator.answerString || determinator.answerCoding) {
                    dependingQuestions.push({
                        id: determinator.question,
                        reference: _currentQuestion,
                        answer: determinator.answerCoding ? { valueCoding: determinator.answerCoding } : { valueString: determinator.answerString }
                    });
                }
                else {
                    // TODO: implement other types when needed
                    console.warn("QuestionnaireData.ts: Currently only answerCoding and answerString supported for depending questions (Question " + _FHIRItem.linkId + ")");
                }
            });
        }
        return dependingQuestions;
    };
    /*
    * Checks if a item has a given extension, and returns the value of the extension (when one of the following:
    *   - valueCodeableConcept
    *   - valueDuration
    *   - valueString
    *   - valueInteger
    *   - valueBoolean (CAVE: when the valueBoolean is FALSE, the method will return FALSE!)
    *   )
    *   If the extension exists with another value, the method returns TRUE.
    *   If the extension does not exist, the method returns UNDEFINED.
    */
    QuestionnaireData.prototype.hasExtension = function (_extensionURL, _extensionSystem, _item) {
        var returnValue = undefined;
        if (_item.extension) {
            _item.extension.forEach(function (extension) {
                if (!returnValue && extension.url === _extensionURL) {
                    if (_extensionSystem && extension.valueCodeableConcept && extension.valueCodeableConcept.coding) {
                        extension.valueCodeableConcept.coding.forEach(function (coding) {
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
                    if (extension.valueExpression && extension.valueExpression.language && extension.valueExpression.language === _extensionSystem) {
                        returnValue = extension.valueExpression;
                    }
                    return (returnValue
                        ? returnValue
                        : true);
                }
            });
        }
        return returnValue;
    };
    /**
    * Recursively searches for a IQuestion by ID.
    * @param _id the id of the IQuestion to find
    * @param _data the (nested) array of IQuestion to search in
    */
    QuestionnaireData.prototype.findQuestionById = function (_id, _data) {
        var _this = this;
        var result = undefined;
        _data.forEach(function (question) {
            if (!result) {
                if (question.id === _id) {
                    result = question;
                }
                else if (question.subItems) {
                    result = _this.findQuestionById(_id, question.subItems);
                }
            }
        });
        return result;
    };
    QuestionnaireData.prototype.getTranslationsFromExtension = function (languageExtensions) {
        var translations = {};
        Array.prototype.forEach.call(languageExtensions.extension, function (extension) {
            var languageCode = extension.extension.find(function (extensionItem) { return extensionItem.url === 'lang'; }).valueCode;
            var content = extension.extension.find(function (extensionItem) { return extensionItem.url === 'content'; }).valueString;
            translations[languageCode] = content;
        });
        return translations;
    };
    QuestionnaireData.prototype.getTranslationsFromDesignation = function (languageDesignations) {
        var translations = {};
        Array.prototype.forEach.call(languageDesignations, function (designation) {
            translations[designation.language] = designation.value;
        });
        return translations;
    };
    return QuestionnaireData;
}());
exports.default = QuestionnaireData;
//# sourceMappingURL=QuestionnaireData.js.map