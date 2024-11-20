# I4MI Questionnaire Data
QuestionnaireData is a class that facilitates the rendering and handling of FHIR Questionnaires in TypeScript / Javascript applications.
- ❗️ Please be aware that this is currently work in progress. 
- ❗️ Not all features of FHIR Questionnaire are supported, and some functionality is not yet documented. 
- ❗️ Although we do our best in carefully developping and testing the class, there are probably minor and major bugs. If you find one, let us know and [raise an issue on github](https://github.com/i4mi/fhir-questionnaire/issues)).
- ❗️ We do not recommend using this for production projects.
- ❗️ QuestionnaireData is based on the FHIR R4 (4.0.1) version of the Questionnaire resource.

See also the documentation of the [FHIR Questionnaire](http://hl7.org/fhir/R4/questionnaire.html) and [FHIR QuestionnaireResponse](http://hl7.org/fhir/R4/questionnaireresponse.html) resources.

## Demo App
There is a [small demo app](./demo) written in Vue.js, that demonstrates the use of the library with different FHIR Questionnaires.

## Basic use
### Install
Before you can use this package in your project, you need to install it, using npm. Point your terminal to the root directory of your project (where also `package.json`is located) and enter the following command.
```bash
npm install @i4mi/fhir_questionnaire
```
Wait for the install to complete and you are ready to set up QuestionnaireData.
### Setup
For every questionnaire you want to handle, you need to initialize a QuestionnaireData instance, providing the FHIR questionnaire resource as a JSON object.

```typescript
import {QuestionnaireData} from '@i4mi/fhir_questionnaire';

// ... other code

const qData = new QuestionnaireData(fhirQuestionnaire);
```

#### External ValueSets
The constructor has also the possibility to hand over ValueSet resources, that are referenced in the Questionnaire (as answerValuesets for questions of type choice). As a matter of fact, it is necessary to provide ValueSets that are not contained in the Questionnaire, since QuestionnaireData does not fetch linked ValueSets by itself. This would be the third, optional parameter of the constructor.  
**Please note:** This feature is not thoroughly tested yet and has a high probability of bugs or unexpected behaviour.

#### Passing on items and hiddenItems
The fourth and fifth optional parameter of the constructor are to pass on IQuestion items and hidden items. This is useful when using in a React enviroment with redux, but can probably be ignored in other setups.

### Rendering of the questions
You can then use the QuestionnaireData instance to get the items and render them. You have to implement the rendering for every Question type the questionnaire you're using has, since a "choice" question needs to be rendered differently than a "free text" question. 
In a Vue.js app, this could look something like that (please mind that this is a very basic example and does not take into account more complicated use cases like nested questions):
```html
<div v-for="question in qData.getQuestions()"
     :key="question.id">
  <div v-if="question.isEnabled"
       :class="'question-' + question.type + (question.isInvalid ? ' invalid' : '')">
    <h2>
      {{ question.label[lang] }}
    </h2>
    <!-- CHOICE question -->
    <ul v-if="question.type === 'choice'">
      <li v-for="answer in question.answerOptions"
          :key="question.id + '-' + answer.code"
          @click="qData.updateQuestionAnswers(question, answer)">
        <input :type="question.allowsMultipleAnswers ? 'checkbox' : 'radio'"
               :checked="qData.isAnswerOptionSelected(question, answer)"
               :name="question.id"
               :id="answer.code.toString()" />
        <label for="answer.code.toString()">
          {{ answer.answer[lang] }}
        </label>
      </li>
    </ul>
    <!-- implement other question types-->
    ...
  </div>
</div>
```

### Retrieving the QuestionnaireResponse
The QuestionnaireResponse can be retrieved with the `getQuestionnaireResponse()` method. You need to provide a language shorthand, which must be one of the shorthands you provided as available language in the constructor when setting up the QuestionnaireData instance.
`getQuestionnaireResponse()` checks the answers for validity, and throws an error if one question has not a valid answer (the first invalid question is then marked with isInvalid=true, so you can give this feedback to the user). For this reason, it is recommended to wrap this in a try/catch block. For detailed options of `getQuestionnaireResponse()`, see below.
```typescript
try {
  const response = qData.getQuestionnaireResponse('en');
} catch(e) {
  console.warn('Something ain\'t right:', e);
}
```

## Interfaces
### IQuestion
Every Questionnaire item is converted to a IQuestion, which makes handling it easier. It has the following properties.  
Properties are marked as followed:  
🎨 = important for rendering
⚙️ = mostly for internal use in QuestionnareData

- 🎨 **type** (QuestionnaireItemType from @i4mi/fhir_r4): The type of the question. Important for rendering.
- 🎨 **label** ({[language: string]: string): The label / question of the string, with strings in every available language (with fallback strings if the Questionnaire does not have the language available)
- 🎨 **prefix** (string): The prefix of the question, often the number of the question in the questionnaire
- 🎨 **answerOptions** (IAnswerOption[], see below): The answer options, for example for choice questions.
- 🎨 **allowsMultipleAnswers** (boolean): Describes if multiple answers are allowed (not applicable for every type of question)
- 🎨 **isEnabled** (boolean): Describes if a question is enabled and should be displayed to the user. This is for example used for questions that are depending on other questions and are only enabled when the other question is answered in a certain way.
- 🎨 **readOnly**: (boolean): Describes if a question is read only and should not be changed by the user. You should take this into account when rendering your questions.
- 🎨 **subItems**? (IQuestion[]): A question of type GROUP, but also other question, can have nested subquestions (which again, can have subquestions).
- 🎨 **isInvalid** (boolean): Indicates if the answer(s) to a question are invalid. This is not updated in real time, but on `getQuestionaireResponse()`
- 🎨/⚙️ **options** (IQuestionOptions, see below): Options for this item.
- ⚙️ **selectedAnswers** (QuestionnaireResponseItemAnswer[], see below): Array of none to multiple answers the user has selected / given to the question.
- ⚙️ **required** (boolean): Describes if the question needs to be answered.
- ⚙️ **initial** (QuestionnaireItemInitial[] from @i4mi/fhir_r4): Initial value of the item.
- ⚙️ **id** (string): Corresponds to the linkId of the Questionnaire item. 
- ⚙️ **dependingQuestionsEnableBehaviour** ('ALL' or 'ANY'): Describes if all of the criteria below must be fulfilled to enable a depending question, or if one criteria is enough.
- ⚙️ **dependingQuestions**: Links depending questions to this question. Depending questions are activated if the criteria are matched.

### IAnswerOption
Answer options conform to this interface:
- **answer** ({[language: string]: string}): The actual answer string, in possible different languages.
- **code** (QuestionnaireResponseItemAnswer from @i4mi/fhir_r4): The actual coding of the answer
- **disableOtherAnswers**: Determines which other answers are unselected if this answer is selected (in multiple choice questions).

### IQuestionOptions
The options object can provice additional information for a question. Often, these are mostly used for internal usage. All of the options are optional.

- **controlTypes** (ItemControlType[]): Describes the UI control types relevant for a question (see the [Questionnaire Item Control Valueset](https://www.hl7.org/fhir/valueset-questionnaire-item-control.html)).
- **min** (number): The minimal value accepted for the item (this is for rendering, not taken into consideration when validating the answers!). 
- **max** (number): The maximum value accepted for the item (this is for rendering, not taken into consideration when validating the answers!). Can be defined in the Questionnaire using the [maxValue extension](http://hl7.org/fhir/StructureDefinition/maxValue).
- **sliderStep** (number): Describes the step for a slider, if provided as [SliderStepValue extension](http://hl7.org/fhir/StructureDefinition/questionnaire-sliderStepValue). If the controlType of a question is `slider`, this should be considered when rendering the question.
- **unit** (Coding): A possible unit as provided by the [QuestionnaireItem Unit extension](http://hl7.org/fhir/StructureDefinition/questionnaire-unit)
- **format** (string): Describes the desired format of the answer, as provided by the [QuestionnaireItem format extension](http://hl7.org/fhir/StructureDefinition/entryFormat). This is to be meant for displaying in the GUI and has no effect on the answer validation in QuestionnaireData.
- **initialExpression** (string): Mostly for internal use. Used to save the FHIRPath expression for calculating the items initial value for populating the Questionnaire. See also [populateAnswers()](#populateAnswers(_resources,-_overWriteExistingAnswers?):-void).
- **calculatedExpression** (string): Mostly for internal use. Used to save the calculated expression (FHIRPath) for calculating an items value. For details, see the [Working with calculated expressions](#Working-with-calculated-expressions) chapter.
- controlType (ItemControlType): **DEPRECATED**. Describes the UI control type relevant for a question (see the [Questionnaire Item Control Valueset](https://www.hl7.org/fhir/valueset-questionnaire-item-control.html)). Will be removed in version 1.0.0.

## Supported types
Not all types of QuestionnaireItems are currently supported by QuestionnaireData. If you need a type that is currently not supported, you can implement it and make a [pull request](https://github.com/i4mi/fhir-questionnaire/pulls). If you don't see yourself able to do so, please [raise an issue](https://github.com/i4mi/fhir-questionnaire/issues). 

|Type     | Generate IQuestion  | Populate Answer | Calculated Expressions | Depending Questions |
|---------|---------------------|-----------------|------------------------|---------------------|
|GROUP    | 🟩 supported        | ⬜️ not applicable| ⬜️ not applicable      | ⬜️ not applicable   |
|DISPLAY  | 🟩 supported        | ⬜️ not applicable| 🟥 not implemented     | ⬜️ not applicable   |
|BOOLEAN  | 🟩 supported        | 🟩 supported     | 🟥 not implemented     | 🟩 supported (2)    |
|DECIMAL  | 🟩 supported        | 🟩 supported     | 🟩 supported           | 🟩 supported (2)    |
|INTEGER  | 🟩 supported        | 🟩 supported     | 🟩 supported           | 🟩 supported (2)    |
|DATE     | 🟩 supported        | 🟩 supported     | 🟥 not implemented     | 🟩 supported (2)    |
|DATETIME | 🟩 supported        | 🟩 supported     | 🟥 not implemented     | 🟩 supported (2)    |
|TIME     | 🟩 supported        | 🟩 supported     | 🟥 not implemented     | 🟩 supported (2)    |
|STRING   | 🟩 supported        | 🟩 supported     | 🟥 not implemented     | 🟩 supported (2)    |
|TEXT     | 🟩 supported        | 🟩 supported     | 🟥 not implemented     | 🟩 supported (2)    |
|URL      | 🟩 supported        | 🟥 not implemented | 🟥 not implemented   | 🟥 not implemented  |
|CHOICE   | 🟩 supported        | 🟩 supported     | 🟥 not implemented     | 🟨 partially implemented (3)|
|OPEN_CHOICE| 🟩 supported      | 🟥 not implemented | 🟥 not implemented   | 🟥 not implemented  |
|ATTACHMENT| 🟩 supported       | 🟥 not implemented | 🟥 not implemented   | 🟥 not implemented  |
|REFERENCE| 🟩 supported        | 🟩 supported     | 🟥 not implemented     | 🟥 not implemented  |
|QUANTITY | 🟩 supported        | 🟩 supported     | 🟩 supported (1)       | 🟥 not implemented  |

- (1) QUANTITY items need an initial value for calculated expressions to work.
- (2) Support of depending questions is different for different operators.
- (3) Support depends on type of the choice items, only for single choice questions.

## Methods
### serialize(): string
Returns the storeable data of the object as a string, not including the questionnaire.
Note for using with React / React Native: When rehydrating with a serialized QuestionnaireData string, you can create a new  QuestionnaireData object using the Questionnaire and then call `unserialize()` on it, passing the serialized string.
- returns: a string representing the QuestionnaireData object _without_ containing the fhir Questionnaire

### unserialize(_data): void
Populates the QuestionnaireData object with data from a previously serialized QuestionnaireData Object. This can be either passed on as a string from `serialize()` or as a JSON object that was created with `JSON.stringify()` from a QuestionnaireData object.
- parameter **_data**: The serialized data from a QuestionnaireData as string or JSON
- throws_  An error if the data is passed as a string with no items property (which is used to detect if it is a serialized QuestionnaireData).

### resetResponse(): void
Resets the response to the questionnaire.

### getQuestions(): IQuestion[]
Returns the questions as an array of IQuestion objects.
- returns: An array of IQuestion objects

### updateQuestionAnswers(_question, _answer): void
Updates the selected answer(s) of a question: adds the answer if it's not already selected and removes it, if it was selected.
*Important when using Vue.js:* When you're using Vue.js and are calling this method directly from the template, Vue.js binds it to the vue instance. For QuestionnaireData to work correctly, you have to explicitly bind it to your QuestionnaireData instance like this: `:onAnswer="qData.updateQuestionAnswers.bind(qData)"`, where qData is your QuestionnaireData instance.
- parameter **_question**: the IQuestion to which the answer belongs
- parameter **_answer**:   the selected / unselected QuestionnaireItemAnswerOption. Important is the `code` property (it needs to contain a `valueString`, `valueInteger`, `valueCoding`, … ), the answer property must be present, but can be an empty object (`{}`).

### isAnswerOptionSelected(_question, _answer): boolean
Checks if a given IAnswerOption is already selected for a IQuestion.
- parameter **_question**:     the IQuestion to which the answer belongs
- parameter **_answer**:       the IAnswerOption in question
- returns: true, if the given answer is selected, false if not

###  getQuestionnaireTitle(_language): string | undefined
Returns the questionnaire title in a given language. 
Falls back to default language of the questionnaire, if the wanted language is not available.
- parameter **_language**: the language code of the wanted language.
- returns: The title, when available in the requested language, else in the Questionnaires default language (or undefined, if no title is set in the Questionnaire) 

###  getQuestionnaireDescription(_language): string | undefined
Returns the questionnaire description in a given language. 
Falls back to default language of the questionnaire, if the wanted language is not available.
- parameter **_language**: the language code of the wanted language.
- returns: The description, when available in the requested language, else in the Questionnaires default language (or undefined, if no description is set in the Questionnaire) 

### restoreAnswersFromQuestionnaireResponse(_fhirResponse): void 
Processes a QuestionnaireResponse and sets its answers to the QuestionnaireData object. The existing answers are overwritten.
- parameter **_fhirResponse**: a QuestionnaireResponse that matches the Questionnaire
- throws: an error if the QuestionnaireResponse is not matching the Questionnaire

### getQuestionnaireResponse(_language,_options?): QuestionnaireResponse
 Gets the QuestionnaireResponse resource with all the currently set answers.
- parameter **_language**: the shorthand for the language the QuestionnaireResponse (eg. 'de' or 'en'), should be in the set of available languages
- parameter **_options**:  Options object that can contain zero, one or many of the following properties:
  - date:      the date when the Questionnaire was filled out (current date by default)
  - includeID: boolean that determines if to include FHIR resource ID of a potential previously restored QuestionnaireResponse (default: false)
  - patient:   a Reference to the FHIR Patient who filled out the Questionnaire
  - midataExtensions: wether to include extensions that are relevant for MIDATA or not. (default: false)
  - reset:     should the questionnaire be reseted after creating the response (default: false)
- throws          an error if the QuestionnaireResponse is not valid for the corresponding Questionnaire, e.g. when a required answer is missing (the first invalid IQuestion is marked with isInvalid)
- returns:         a QuestionnaireResponse FHIR resource containing all the answers the user gave

### getQuestionnaireURLwithVersion(): string
Returns the questionnaire URL with version number in FHIR canonical format.
- returns: a canonical questionnaire URL

### isResponseComplete(_onlyRequired?, _markInvalid?): boolean
Checks a QuestionnaireResponse for completeness.
- parameter **_onlyRequired**:  optional parameter, to specify if only questions with the required attribute need to be answered or all questions (default: false)
- parameter **_markInvalid**: optional parameter, to specify if not completed questions should be updated to be invalid (see isInvalid property) (default: true)
- returns: TRUE if all questions are answered, FALSE if at least one question is not answered

### isQuestionComplete(_question, _markInvalid?): boolean 
Determines if a question has an answer, when an answer is required. Also checks potential subquestions, if these are activated.
- parameter **_question**: the question that should be checked
- parameter **_markInvalid**: optional parameter, indicates if the question (and subquestion) should be marked as invalid if the question is not complete. defaults to true.
- returns:  TRUE, if the question either does not require an answer, or does require and has at least one answer. If the questions subquestions are activated and not complete, the parent question is also regarded incomplete and thus FALSE is returned.

### isTouched(): boolean
Determines if any question has been answered yet. Also checks subquestions, if activated.
- returns: TRUE, if at least one question has an answer. FALSE, if all questions remain unanswered.


### populateAnswers(_resources, _overWriteExistingAnswers?): void     
Populates the questions with initialExpression FHIRPath extensions with data from given resources.
The FHIRPath resources need to specify the needed resource type with %type as first node of the FHIRPath expressions (e.g. `'%patient.name.given.first()'`). You can use more complicated expressions with %type syntax (for example `%patient.name.where(use='official').given.first() + ' ' + %patient.name.where(use='official').family.first()`. An expression can only be populated from one resource, however a questionnaire can have multiple expression with different resources. When populating an item of type quantity, the result of the expression must be a string with value and unit separated by a space (e.g. `123 cm`).
- parameter **_resources**: an Array of resources used to populate the answers (e.g. Patient resource). Each resource type can only be in the array once.
- parameter **_overWriteExistingAnswers**: optional parameter, specifies if existing answers should be overwritten (default: false)

### findQuestionById(_id, _data): IQuestion | undefined {
Recursively searches for a IQuestion by ID. This is useful if a Questionnaires questions are nested on multiple layers.
- parameter **_id**: the id of the IQuestion to find
- parameter **_data**: the (nested) array of IQuestion to search in

## Working with calculated expressions
With calculated expressions, you can set the answer to one or multiple items of your questionnaire automatically, depending on the responses given on the responses the user gave to the other elements.
You have to specify a [FHIRPath](https://hl7.org/fhirpath/)-Expression, that can be applied to the QuestionnaireResponse to extract a single value. The questionnaireResponse item is referred to as `item` in the calculated expression. The first value of the FHIRPath evaluation is then written to the items answer. The expression has to be defined in the [calculatedExpression extension](http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-calculatedExpression). 
You can see some examples in the [Calculated Expressions Questionnaire](./__tests__/questionnaires/calculatedExpression.json).

Currently, calculated expressions are only available for items with the hidden-Extension.

## Changelog
See [CHANGELOG.md](CHANGELOG.md)