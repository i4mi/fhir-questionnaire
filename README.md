# I4MI Questionnaire Data
QuestionnaireData is a class that facilitates the rendering and handling of FHIR Questionnaires in TypeScript / Javascript applications.
- ❗️ Please be aware that this is currently work in progress. 
- ❗️ Not all features of FHIR Questionnaire are supported, and a lot of functionality is not yet documented. 
- ❗️ There are probably minor and major bugs (if you find one - [let me know!](mailto:heg2@bfh.ch)).
- ❗️ We do not recommend using this for production projects.
- ❗️ The class is based on the FHIR R4 (4.0.1) version of the Questionnaire ressource.

See also the documentation of the [FHIR Questionnaire](http://hl7.org/fhir/R4/questionnaire.html) and [FHIR QuestionnaireResponse](http://hl7.org/fhir/R4/questionnaireresponse.html) ressources.

## Demo App
There is a [small demo app](./demo) written in Vue.js, that demonstrates the use of the library with different FHIR Questionnaires.

## Basic use
### Setup
For every questionnaire you want to handle, you need to initialize a QuestionnaireData instance, providing the FHIR questionnaire resource as a JSON object, and at least one shorthand for an available language:
```typescript
const qData = new QuestionnaireData(fhirQuestionnaire, ['en']);
```
//TODO: describe additional options

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
//TODO: differ which elements are useful for rendering, and which are only internal
- **id** (string): Corresponds to the linkId of the Questionnaire item
- **type** (QuestionnaireItemType from @i4mi/fhir_r4): The type of the question
- **label** ({[language: string]: string): The label / question of the string, with strings in every available language (with fallback strings if the Questionnaire does not have the language available)
- **prefix** (string): The prefix of the question, often the number of the question in the questionnaire
- **answerOptions** (IAnswerOption[], see below): The answer options, for example for choice questions.
- **required** (boolean): Describes if the question needs to be answered.
- **allowsMultipleAnswers** (boolean): Describes if multiple answers are allowed (not applicable for every type of question)
- **isEnabled** (boolean): Describes if a question is enabled and should be displayed to the user. This is for example used for questions that are depending on other questions and are only enabled when the other question is answered in a certain way.
- **readOnly**: (boolean): Describes if a question is read only and should not be changed by the user. You should take this into account when rendering your questions.
- **selectedAnswers** (QuestionnaireResponseItemAnswer[], see below): Array of none to multiple answers the user has selected / given to the question.
- **subItems**? (IQuestion[]): A question of type GROUP, but also other question, can have nested subquestions (which again, can have subquestions).
- **relatedResourceId** (string): //TODO: I have no idea myself what this does 🤓
- **isInvalid** (boolean): Indicates if the answer(s) to a question are invalid. This is not updated in real time, but on `getQuestionaireResponse()`
- **initial** (QuestionnaireItemInitial[] from @i4mi/fhir_r4): Initial value of the item.
- **options** (IQuestionOptions, see below): Options for this item.
- **dependingQuestionsEnableBehaviour** ('ALL' or 'ANY'): Describes if all of the criteria below must be fulfilled to enable a depending question, or if one criteria is enough.
- **dependingQuestions**: Links depending questions to this question. Depending questions are activated if the criteria are matched.

### IAnswerOption
Answer options conform to this interface:
- **answer** ({[language: string]: string}): The actual answer string, in possible different languages.
- **code** (QuestionnaireResponseItemAnswer from @i4mi/fhir_r4): The actual coding of the answer
- **disableOtherAnswers**: Determines which other answers are unselected if this answer is selected (in multiple choice questions).

### IQuestionOptions
All of the options are optional.
//TODO: description
- **controlType** (ItemControlType):
- **min** (number):
- **max** (number):
- **sliderStep** (number):
- **unit** (Coding):
- **format** (string):
- **initialExpression** (string):
- **calculatedExpression** (string):

## Supported types
Not all types of QuestionnaireItems are currently supported by QuestionnaireData. If you need a type that is currently not supported, you can implement it and make a pull request. If you don't see yourself able to do so, please raise an issue //TODO: links. 

|Type     | Generate IQuestion  | Populate Answer | Calculated Expressions | Depending Questions |
|---------|---------------------|-----------------|------------------------|---------------------|
|GROUP    | 🟩 supported        | ⬜️ not applicable| ⬜️ not applicable      | ⬜️ not applicable   |
|DISPLAY  | 🟩 supported        | 🟥 not implemented | 🟥 not implemented   | ⬜️ not applicable   |
|BOOLEAN  | 🟩 supported        | 🟩 supported     | 🟥 not implemented     | 🟩 supported (2)    |
|DECIMAL  | 🟩 supported        | 🟩 supported     | 🟩 supported           | 🟩 supported (2)    |
|INTEGER  | 🟩 supported        | 🟩 supported     | 🟩 supported           | 🟩 supported (2)    |
|DATE     | 🟩 supported        | 🟩 supported     | 🟥 not implemented     | 🟩 supported (2)    |
|DATETIME | 🟩 supported        | 🟩 supported     | 🟥 not implemented     | 🟩 supported (2)    |
|TIME     | 🟩 supported        | 🟩 supported     | 🟥 not implemented     | 🟩 supported (2)    |
|STRING   | 🟩 supported        | 🟩 supported     | 🟥 not implemented     | 🟩 supported (2)    |
|TEXT     | 🟩 supported        | 🟩 supported     | 🟥 not implemented     | 🟩 supported (2)    |
|URL      | 🟩 supported  | 🟥 not implemented | 🟥 not implemented         | 🟥 not implemented  |
|CHOICE   | 🟩 supported        | 🟩 supported     | 🟥 not implemented     | 🟨 partially implemented (3)|
|OPEN_CHOICE| 🟩 supported      | 🟥 not implemented | 🟥 not implemented   | 🟥 not implemented  |
|ATTACHMENT| 🟩 supported | 🟥 not implemented | 🟥 not implemented         | 🟥 not implemented  |
|REFERENCE| 🟩 supported        | 🟩 supported     | 🟥 not implemented     | 🟥 not implemented  |
|QUANTITY | 🟩 supported        | 🟩 supported     | 🟩 supported (1)       | 🟥 not implemented  |

(1) QUANTITY items need an initial value for calculated expressions to work.
(2) Support of depending questions is different for different operators.
(3) Support depends on type of the choice items, only for single choice questions.

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
- parameter **_question**: the IQuestion to which the answer belongs
- parameter **_answer**:   the selected / unselected QuestionnaireItemAnswerOption

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

### restoreAnswersFromQuestionnaireResponse(_fhirResponse): void 
Processes a QuestionnaireResponse and sets its answers to the QuestionnaireData object.
- parameter **_fhirResponse**: a QuestionnaireResponse that matches the Questionnaire
- throws: an error if the QuestionnaireResponse is not matching the Questionnaire

### getQuestionnaireResponse(_language,_options?): QuestionnaireResponse
 Gets the QuestionnaireResponse resource with all the currently set answers.
- parameter **_language**: the shorthand for the language the QuestionnaireResponse (eg. 'de' or 'en'), should be in the set of available languages
- parameter **_options  Options object that can contain zero, one or many of the following properties:
  - date:      the date when the Questionnaire was filled out (current date by default)
  - includeID: boolean that determines if to include FHIR resource ID of a potential previously restored QuestionnaireResponse (default: false)
  - patient:   a Reference to the FHIR Patient who filled out the Questionnaire
  - reset:     should the questionnaire be reseted after creating the response (default: false)
- throws          an error if the QuestionnaireResponse is not valid for the corresponding Questionnaire, e.g. when a required answer is missing (the first invalid IQuestion is marked with isInvalid)
- returns:         a QuestionnaireResponse FHIR resource containing all the answers the user gave

### getQuestionnaireURLwithVersion(): string
Returns the questionnaire URL with version number in FHIR canonical format.
- returns: a canonical questionnaire URL

### isResponseComplete(_onlyRequired?): boolean
Checks a QuestionnaireResponse for completeness.
- parameter **_onlyRequired**:  optional parameter, to specify if only questions with the required attribute need to be answered or all questions (default: false)
- returns: true if all questions are answered, false if at least one question is not answered

### populateAnswers(_resources, _overWriteExistingAnswers?): void     
Populates the questions with initialExpression FHIRPath extensions with data from given resources.
The FHIRPath resources need to specify the needed resource type with %type as first node of the FHIRPath expressions (e.g. `'%patient.name.given.first()'`).
- parameter ** _resources**: an Array of resources used to populate the answers (e.g. Patient resource). Each resource type can only be in the array once.
- parameter **_overWriteExistingAnswers**: optional parameter, specifies if existing answers should be overwritten (default: false)

### findQuestionById(_id, _data): IQuestion | undefined {
Recursively searches for a IQuestion by ID. This is useful if a Questionnaires questions are nested on multiple layers.
- parameter **_id**: the id of the IQuestion to find
- parameter **_data**: the (nested) array of IQuestion to search in

## Changelog
See [CHANGELOG.md](CHANGELOG.md)