# I4MI Questionnaire Data
QuestionnaireData is a class that facilitates the rendering and handling of FHIR Questionnaires in TypeScript / Javascript applications.
❗️ Please be aware that this is currently work in progress. 
❗️ Not all features of FHIR Questionnaire are supported, and a lot of functionality is not yet documented. 
❗️ There are probably minor and major bugs (if you find one - [let me know!](mailto:heg2@bfh.ch)).
❗️ We do not recommend using this for production projects.
❗️ The class is based on the FHIR R4 (4.0.1) version of the Questionnaire ressource.

See also the documentation of the [FHIR Questionnaire](http://hl7.org/fhir/R4/questionnaire.html) and [FHIR QuestionnaireResponse](http://hl7.org/fhir/R4/questionnaireresponse.html) ressources.
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
        <input type="radio"
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

## Methods
### serialize(): string
    /**
     * Returns the storeable data of the object as a string, not including the questionnaire.
     * When rehydrating with a serialized QuestionnaireData string, you can create a new 
     * QuestionnaireData object using the Questionnaire and then call .unserialize() on it, 
     * passing the serialized string
     * @returns a string representing the QuestionnaireData object _without_ containing 
     *              - the fhir Questionnaire
     * @see     unserialize()
     */

### unserialize(_data): void
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
}): void

### resetResponse(): void
    /**
    * Resets the response to the questionnaire
    **/

### getQuestions(): IQuestion[]
Returns the questions array.

### updateQuestionAnswers(_question, _answer): void
    /**
     * Updates the selected answer(s) of a question: adds the answer if it's not already selected
     * and removes it, if it was selected.
     * @param _question     the IQuestion to which the answer belongs
     * @param _answer       the selected / unselected QuestionnaireItemAnswerOption
     **/

### isAnswerOptionSelected(_question, _answer): boolean
    /**
    * Checks if a given IAnswerOption is already selected for a IQuestion.
    * @param _question     the IQuestion to which the answer belongs
    * @param _answer       the IAnswerOption in question
    **/

###  getQuestionnaireTitle(_language): string | undefined
    /**
    * Returns the questionnaire title in a given language. 
    * Falls back to default language of the questionnaire, 
    * if the wanted language is not available.
    * @param _language the language code of the wanted language. 
    **/

### restoreAnswersFromQuestionnaireResponse(_fhirResponse): void 
    /**
    * Processes a QuestionnaireResponse and parses the given answers to the local iQuestion array
    * @param _fhirResponse a QuestionnaireResponse that matches the Questionnaire
    * @throws an error if the questionnaire response is not matching the questionnaire
    **/

### getQuestionnaireResponse(_language,_options?): QuestionnaireResponse
    /**
    * Gets the QuestionnaireResponse resource with all the currently set answers.
    * @param _language the shorthand for the language the QuestionnaireResponse should be in (eg 'de' or 'en')
    * @param _options  Options object that can contain zero, one or many of the following properties:
    *                  - date:      the date when the Questionnaire was filled out (current date by default)
    *                  - includeID: boolean that determines if to include FHIR resource ID of a potential 
    *                               previously restored QuestionnaireResponse (default: false)
    *                  - patient:   a Reference to the FHIR Patient who filled out the Questionnaire
    *                  - reset:     should the questionnaire be reseted after creating the response (default: false)
    * @returns         a QuestionnaireResponse FHIR resource containing all the answers the user gave
    * @throws          an error if the QuestionnaireResponse is not valid for the corresponding
    *                  Questionnaire, e.g. when a required answer is missing
    **/

### getQuestionnaireURLwithVersion(): string
    /**
    * Returns the questionnaire URL with version number in FHIR canonical format.
    * @return a canonical questionnaire URL
    **/

### isResponseComplete(_onlyRequired?): boolean
    /**
    * Checks a QuestionnaireResponse for completeness.
    * @param   onlyRequired optional parameter, to specify if only questions with
    *          the required attribute need to be answered or all questions;
    *           default value is: false
    * @returns true if all questions are answered
    *          false if at least one answer is not answered
    */

### populateAnswers(_resources, _overWriteExistingAnswers?): void     
    /**
    * Populates the questions with initialExpression FHIRPath extensions with data from given resources.
    * The FHIRPath resources need to specify the needed resource type with %type as first node of the FHIRPath
    * expressions (e.g. '%patient.name.given.first()').
    * @param _resources     array of resources used to populate the answers (e.g. Patient resource). Each resource
    *                       type can only be in the array once.
    * @param _overWriteExistingAnswers (optional) specifies if existing answers should be overwritten (default: false)
    */

### findQuestionById(_id, _data): IQuestion | undefined {
    /**
    * Recursively searches for a IQuestion by ID. This is useful if a Questionnaires questions
    * are nested on multiple layers.
    * @param _id the id of the IQuestion to find
    * @param _data the (nested) array of IQuestion to search in
    */

## Changelog
See [CHANGELOG.md](CHANGELOG.md)