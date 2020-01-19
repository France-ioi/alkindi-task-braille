
import update from 'immutability-helper';
import algoreaReactTask from './algorea_react_task';

import 'font-awesome/css/font-awesome.css';
import 'bootstrap/dist/css/bootstrap.css';
import './style.css';
import './symbols.css';

import SymbolsBundle from './symbols_bundle';
import CipheredTextBundle from './ciphered_text_bundle';
import PermutatedTextBundle from './permutated_text_bundle';
import XORTextBundle from './xor_text_bundle';
import ANDTextBundle from './and_text_bundle';
import FrequencyAnalysisBundle from './frequency_analysis_bundle';
import SubstitutionsBundle from './substitutions_bundle';
import DecipheredTextBundle from './deciphered_text_bundle';
import HintsBundle from './hints_bundle';
import WorkspaceBundle from './workspace_bundle';
import {loadSubstitutions} from './utils';

const TaskBundle = {
  actionReducers: {
    appInit: appInitReducer,
    taskInit: taskInitReducer /* possibly move to algorea-react-task */,
    taskRefresh: taskRefreshReducer /* possibly move to algorea-react-task */,
    taskAnswerLoaded: taskAnswerLoaded,
    taskStateLoaded: taskStateLoaded,
  },
  includes: [
    SymbolsBundle,
    CipheredTextBundle,
    PermutatedTextBundle,
    XORTextBundle,
    ANDTextBundle,
    FrequencyAnalysisBundle,
    SubstitutionsBundle,
    // DecipheredTextBundle,
    HintsBundle,
    WorkspaceBundle,
  ],
  selectors: {
    getTaskState,
    getTaskAnswer,
  }
};

if (process.env.NODE_ENV === 'development') {
  /* eslint-disable no-console */
  TaskBundle.earlyReducer = function (state, action) {
    console.log('ACTION', action.type, action);
    return state;
  };
}

function appInitReducer (state, _action) {
  const taskMetaData = {
    "id": "http://concours-alkindi.fr/tasks/2018/enigma",
    "language": "fr",
    "version": "fr.01",
    "authors": "Sébastien Carlier",
    "translators": [],
    "license": "",
    "taskPathPrefix": "",
    "modulesPathPrefix": "",
    "browserSupport": [],
    "fullFeedback": true,
    "acceptedAnswers": [],
    "usesRandomSeed": true
  };
  return {...state, taskMetaData};
}

function taskInitReducer (state, _action) {
  return state;
}

function taskRefreshReducer (state, _action) {
 return state;
}

function getTaskAnswer (state) {
  const {taskData: {alphabet}, permutationText, xorText, andText} = state;
  return {
    substitutions: state.substitutions.cells
    .reduce((arr, {editable}, index) => {
        const rank = alphabet.indexOf(editable);
        if (rank !== -1) {
          arr.push([index, rank]);
        }
        return arr;
      }, []),
    permutation: permutationText.dump,
    xor: xorText.dump,
    and: andText.dump
  };
}

function taskAnswerLoaded (state, {payload: {answer}}) {
  const {alphabet, hints} = state.taskData;
  const {substitutions: subs, permutation, xor, and} = answer;
  const substitutions = loadSubstitutions(alphabet, hints, subs);
  return update(state, {
    substitutions: {$set: substitutions},
    permutationText: {dump: {$set: permutation}},
    xorText: {dump: {$set: xor}},
    andText: {dump: {$set: and}}
  });
}

function getTaskState (state) {
  return state;
}

function taskStateLoaded (state, {payload: {_dump}}) {
  return state;
}

export function run (container, options) {
  return algoreaReactTask(container, options, TaskBundle);
}
