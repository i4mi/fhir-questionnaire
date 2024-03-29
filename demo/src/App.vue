<template>
  <div>
    <header>
      <img src="@/assets/logo.png" />
      <h1>FHIR Questionnaire Demo</h1>
      <div id="questionnaire-selector">
        <span> Fragebogen auswählen: </span>
        <select
          v-model="questionnaire"
          name="questionnaire-selector"
          @change="setQuestionnaire">
          <option
            v-for="questionnaire in questionnaires"
            :key="questionnaire.name">
            {{ questionnaire.name }}
          </option>
        </select>
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
          zurücksetzen
        </button>
        <button @click="setAnswers">Antworten speichern</button>
      </div>
      <p v-if="qData === undefined">Es wurde noch kein Fragebogen ausgewählt.</p>
    </main>

    <!-- OWN QUESTIONNAIRE MODAL-->
    <div
      v-if="showOwnQuestionnaireModal"
      class="modal"
      id="ownQuestionnaireModal">
      <textarea v-model="ownQuestionnaire"></textarea>
      <button
        @click="
          () => {
            showOwnQuestionnaireModal = false;
            ownQuestionnaire = '';
          }
        ">
        abbrechen
      </button>
      <button
        :disabled="ownQuestionnaire === ''"
        @click="loadOwnQuestionnaire">
        laden
      </button>
    </div>

    <!-- RESPONSE MODAL-->
    <div
      v-if="response"
      class="modal"
      id="response-modal">
      <p>Hier ist die QuestionnaireResponse-Resource:</p>
      <textarea v-model="response"></textarea>
      <button @click="response = undefined">schliessen</button>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import QuestionComponent from './components/Question.vue';
import ZARIT from '@/assets/questionnaires/zarit.json';
import BLUEBOOK from '@/assets/questionnaires/bluebook.json';
import SITUATION from '@/assets/questionnaires/situation.json';
import INITIAL from '@/assets/questionnaires/initialValues.json';
import type {Questionnaire} from '@i4mi/fhir_r4';
import {QuestionnaireData} from '@i4mi/fhir_questionnaire';

const OWN_QUESTIONNAIRE = '[ eigener Fragebogen ]';

export default defineComponent({
  name: 'App',
  components: {QuestionComponent},
  data() {
    return {
      lang: 'de',
      availableLanguages: ['de', 'en', 'fr'],
      qData: undefined as QuestionnaireData | undefined,
      resetCounter: 0,
      questionnaire: undefined,
      questionnaires: [
        {
          name: '',
          description: '',
          questionnaire: undefined
        },
        {
          name: 'ZARIT',
          description:
            'Der ZARIT Fragebogen dient pflegenden Angehörigen dazu, ihre eigene Belastung zu evaluieren. Der Fragebogen ist verfügbar in deutsch und französisch. Das letzte Item der QuestionnaireReponse ist ein Score, der automatisch berechnet wird.',
          questionnaire: ZARIT as Questionnaire
        },
        {
          name: 'Initial Values',
          description: 'Ein Fragebogen, bei dem bereits Antworten vorgegeben sind (initial values)',
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
            'Fragebogen aus dem Corona Science Projekt, mit dem die aktuelle Situation der Befragen erfasst wird. Dieser Fragebogen verfügt über voneinander abhängige Fragen sowie über die "unselect-others"-Extension, bei der eine Antwort auf eine Multiple-Choice-Frage andere Antworten ausschliessen kann.',
          questionnaire: SITUATION as Questionnaire
        },
        {
          name: OWN_QUESTIONNAIRE,
          description: 'Laden Sie Ihren eigenen FHIR Questionnaire.',
          questionnaire: {resourceType: 'Questionnaire'} as Questionnaire
        }
      ],
      ownQuestionnaire: '',
      showOwnQuestionnaireModal: false,
      response: undefined as string | undefined
    };
  },
  mounted() {},
  methods: {
    setQuestionnaire(): void {
      const questionnaire = this.questionnaires.find(q => q.name === this.questionnaire);
      if (questionnaire && questionnaire.questionnaire) {
        if (questionnaire.name === OWN_QUESTIONNAIRE) {
          this.showOwnQuestionnaireModal = true;
        } else {
          this.qData = new QuestionnaireData(questionnaire.questionnaire, this.availableLanguages);
        }
      }
    },
    loadOwnQuestionnaire() {
      this.showOwnQuestionnaireModal = false;
      this.qData = new QuestionnaireData(JSON.parse(this.ownQuestionnaire), this.availableLanguages);
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
        console.log('Es ging etwas schief beim Questionnaire speichern', error);
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
  background-color: black;
  display: inline-flex;
}
header img {
  height: 4rem;
  margin: 0.5rem;
}
header h1 {
  font-size: 2.5rem;
  background: -webkit-linear-gradient(45deg, #d73e2e, #fef7d0);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 400;
  margin: 1rem;
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
  background-color: #ddd;
  width: 50%;
  height: 20em;
  position: fixed;
  top: 5%;
  color: black;
  z-index: 100;
  margin-left: 25%;
  padding: 1em;
}

.modal p {
  margin-top: 0;
}

button {
  margin: 0.5em;
  display: inline-block;
  width: 25%;
}

.modal textarea {
  width: 100%;
  height: 18em;
}
</style>
