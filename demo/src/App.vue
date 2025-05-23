<template>
  <div>
    <header>
      <h1 @click="unsetQuestionnaire">FHIR Questionnaire Demo</h1>
      <div id="questionnaire-selector">
        <span> Select questionnaire: </span>
        <select
          v-model="questionnaire"
          name="questionnaire-selector"
          @change="() => setQuestionnaire(questionnaire)">
          <option
            v-for="questionnaire in questionnaires"
            :key="questionnaire.name">
            {{ questionnaire.name }}
          </option>
        </select>
        <a
          href="https://hl7.org/fhir/R4/questionnaire.html"
          target="fhir"
          title="Show official FHIR R4 Questionnaire specification"
          class="help-button"
          >?</a
        >
      </div>
    </header>

    <main>
      <div v-if="qData !== undefined">
        <QuestionComponent
          v-for="question in qData.getQuestions()"
          :key="
            /* this is a hack, when the counter increases on reset, the question component gets a new key and thus is re-rendered*/
            resetCounter + question.id
          "
          :question="question"
          :language="lang"
          :onAnswer="qData.updateQuestionAnswers.bind(qData)"
          :isSelected="qData.isAnswerOptionSelected.bind(qData)" />
        <button
          :disabled="!qData"
          @click="reset">
          reset
        </button>
        <button @click="setAnswers">generate QuestionnaireResponse</button>
      </div>
      <NoQuestionnairePage
        :questionnaires="questionnaires"
        :onSelect="(q: string) => setQuestionnaire(q)"
        v-if="qData === undefined" />
    </main>

    <!-- OWN QUESTIONNAIRE MODAL-->
    <div
      v-if="showOwnQuestionnaireModal"
      class="modal"
      id="ownQuestionnaireModal">
      <p>You can paste your FHIR Questionnaire resource here (R4):</p>
      <textarea v-model="ownQuestionnaire"></textarea>
      <button
        @click="
          () => {
            showOwnQuestionnaireModal = false;
            ownQuestionnaire = '';
          }
        ">
        cancel
      </button>
      <button
        :disabled="ownQuestionnaire === ''"
        @click="loadOwnQuestionnaire">
        load
      </button>
    </div>

    <!-- RESPONSE MODAL-->
    <div
      v-if="response"
      class="modal"
      id="response-modal">
      <p>Voilà – your QuestionnaireResponse resource:</p>
      <textarea v-model="response"></textarea>
      <button @click="response = undefined">close</button>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import QuestionComponent from './components/Question.vue';
import NoQuestionnairePage from './components/NoQuestionnairePage.vue';
import ZARIT from '@/assets/questionnaires/zarit.json';
import BLUEBOOK from '@/assets/questionnaires/bluebook.json';
import SITUATION from '@/assets/questionnaires/situation.json';
import INITIAL from '@/assets/questionnaires/initialValues.json';
import {QuestionnaireItemType, QuestionnairePublicationStatus, type Questionnaire} from '@i4mi/fhir_r4';
import {QuestionnaireData} from '@i4mi/fhir_questionnaire';

const OWN_QUESTIONNAIRE = 'your own questionnaire';
const OWN_QUESTIONNAIRE_DEFAULT: Questionnaire = {
  resourceType: 'Questionnaire',
  status: QuestionnairePublicationStatus.DRAFT,
  title: 'Insert your questionnaire here',
  item: [
    {
      linkId: 'q1',
      type: QuestionnaireItemType.TEXT,
      text: 'Example question'
    }
  ]
};

export default defineComponent({
  name: 'App',
  components: {QuestionComponent, NoQuestionnairePage},
  data() {
    return {
      lang: 'de',
      availableLanguages: ['de', 'en', 'fr'],
      qData: undefined as QuestionnaireData | undefined,
      resetCounter: 0,
      questionnaire: undefined as string | undefined,
      questionnaires: [
        {
          name: 'ZARIT',
          description:
            'The ZARIT questionnaire helps family carers to evaluate their own stress levels. The questionnaire is available in German and French. The last item of the questionnaire response is a score that is calculated automatically.',
          questionnaire: ZARIT as Questionnaire
        },
        {
          name: 'Initial Values',
          description: 'A questionnaire with some answers already prepopuleted (initial values)',
          questionnaire: INITIAL as Questionnaire
        },
        {
          name: 'Neonatology Bluebook',
          description: 'A questionnaire about new born children.',
          questionnaire: BLUEBOOK as Questionnaire
        },
        {
          name: 'COVID Situation',
          description:
            'This questionnaire has interdependent questions as well as the ‘unselect-others’ extension, in which an answer to a multiple-choice question can exclude other answers.',
          questionnaire: SITUATION as Questionnaire
        },
        {
          name: OWN_QUESTIONNAIRE,
          description: 'Load your own FHIR Questionnaire.',
          questionnaire: {resourceType: 'Questionnaire'} as Questionnaire
        }
      ],
      ownQuestionnaire: JSON.stringify(OWN_QUESTIONNAIRE_DEFAULT, null, 2),
      showOwnQuestionnaireModal: false,
      response: undefined as string | undefined
    };
  },
  mounted() {},
  methods: {
    setQuestionnaire(qName?: string): void {
      this.questionnaire = qName;

      console.log('setQuestionnaire');
      const questionnaire = this.questionnaires.find((q) => q.name === this.questionnaire);
      if (questionnaire && questionnaire.questionnaire) {
        if (questionnaire.name === OWN_QUESTIONNAIRE) {
          this.showOwnQuestionnaireModal = true;
        } else {
          this.qData = new QuestionnaireData(questionnaire.questionnaire, this.availableLanguages);
        }
      }
    },
    unsetQuestionnaire() {
      this.questionnaire = undefined;
      this.qData = undefined;
    },
    loadOwnQuestionnaire() {
      try {
        this.qData = new QuestionnaireData(JSON.parse(this.ownQuestionnaire), this.availableLanguages);
        this.showOwnQuestionnaireModal = false;
      } catch (e) {
        window.alert(
          'I really tried to parse your input, but it is kind of hard to understand. Please make sure to provide a valid FHIR Questionnaire resource.\n\n' +
            e
        );
        this.showOwnQuestionnaireModal = true;
      }
    },
    setAnswers(): void {
      if (!this.qData) return;
      try {
        this.response = JSON.stringify(
          this.qData.getQuestionnaireResponse(this.lang, {
            reset: false,
            includeID: true
          }),
          null,
          2
        );
      } catch (error) {
        window.alert("I'm sorry, but something went wrong during generating the questionnaire response:\n\n" + error);
      }
    },
    reset() {
      this.qData?.resetResponse();
      this.resetCounter++; // so the questions get re-rendered
    }
  }
});
</script>

<style scoped>
header {
  width: 100%;
  height: 5em;
  background-color: #86bbd8;
  color: #2f4858;
  display: inline-flex;
}
header h1 {
  font-size: 2.5rem;
  font-weight: 400;
  margin-top: auto;
  margin-bottom: auto;
  margin-left: 1rem;
  margin-bottom: 1rem;
  padding: 0;
}
header #questionnaire-selector {
  font-weight: light;
  position: absolute;
  right: 1em;
  top: 2em;
  height: 2em;
}
main {
  margin: 1em;
  font-weight: light;
}
.modal {
  background-color: #86bbd8;
  width: 70%;
  height: calc(80vh - 6em);
  position: fixed;
  top: 6em;
  color: black;
  z-index: 100;
  margin-left: 15%;
  padding: 1em;
  border-radius: 0.5em;
}

.modal p {
  margin-top: 0;
  margin-bottom: 0.5em;
}

button {
  margin: 0.5em;
  display: inline-block;
  width: 25%;
}

.modal textarea {
  width: 100%;
  height: calc(80vh - 12em);
}

.help-button {
  display: inline-block;
  background-color: #2f4858;
  color: #86bbd8;
  width: 1.4em;
  height: 1.4em;
  border-radius: 0.7em;
  text-align: center;
  font-size: 0.8em;
  line-height: 1.4em;
  margin: 0.5em;
}
.help-button:hover {
  color: #2f4858;
  background-color: #f6ae2d;
}
</style>
