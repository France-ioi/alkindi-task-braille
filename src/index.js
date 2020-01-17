
import update from 'immutability-helper';
import algoreaReactTask from './algorea_react_task';

import 'font-awesome/css/font-awesome.css';
import 'bootstrap/dist/css/bootstrap.css';
import './style.css';
import './symbols.css';

import SymbolsBundle from './symbols_bundle';
import CipheredTextBundle from './ciphered_text_bundle';
import PermutatedTextBundle from './permutated_text_bundle';
import FrequencyAnalysisBundle from './frequency_analysis_bundle';
import SubstitutionsBundle from './substitutions_bundle';
import DecipheredTextBundle from './deciphered_text_bundle';
import HintsBundle from './hints_bundle';
import WorkspaceBundle from './workspace_bundle';
import {dumpSubstitutions, loadSubstitutions} from './utils';

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
    // FrequencyAnalysisBundle,
    // SubstitutionsBundle,
    // DecipheredTextBundle,
    // HintsBundle,
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
  // const substitutionSpecs = new Array(numMessages).fill([]);
  // const substitutions = loadSubstitutions(alphabet,  hints, substitutionSpecs);
  return {...state, /*substitutions,*/ taskReady: true};
}

function taskRefreshReducer (state, _action) {
  // const dump = dumpSubstitutions(alphabet, state.substitutions);
  // const substitutions = loadSubstitutions(alphabet, hints, dump);
  return {...state,/*substitutions*/};
}

function getTaskAnswer (state) {
  const {permutationText} = state;
  return {
    permutation: permutationText.dump
  };
}

function taskAnswerLoaded (state, {payload: {answer}}) {
  const {permutation} = answer;
  return update(state, {
    permutationText: {dump: {$set: permutation}}
  });
}

function getTaskState (_state) {
  return {};
}

function taskStateLoaded (state, {payload: {_dump}}) {
  return state;
}

export function run (container, options) {
  return algoreaReactTask(container, options, TaskBundle);
}
