
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
import {loadSubstitutions, applySubstitutions} from './utils';


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
    DecipheredTextBundle,
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
  return {...state, highlightSymbol: -1};
}

function taskRefreshReducer (state, _action) {
  return state;
}

function getTaskAnswer (state) {
  const {taskData: {alphabet}, decipheredText, substitutions, permutationText, xorText, andText} = state;
  const {cells, decipheredLetters: decipheredLetterS} = decipheredText;

  let decipheredLetters = {};
  Object.keys(decipheredLetterS)
    .forEach(key => {
      const {charAt, isHint} = decipheredLetterS[key];
      if (charAt !== null && (isHint === undefined || !isHint)) {
        decipheredLetters[key] = {charAt};
      }
    });

  const position = cells.length - 1;

  function getCell (index) {
    const ciphered = cells[index];
    let cell = {position: index, ciphered};
    let rank = ciphered;
    if (index <= position) {
      Object.assign(cell, applySubstitutions(substitutions, rank));
      if (cell.rank !== -1) {
        return alphabet[cell.rank];
      }
      if (decipheredLetters[index]) {
        return decipheredLetters[index].charAt;
      }
    }
    return " ";
  }

  let answerText = '';
  for (let i = 0; i < 200; i++) {
    answerText += getCell(i);
  }


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
      and: andText.dump,
      decipheredLetters,
      answerText
    };
}

function taskAnswerLoaded (state, {payload: {answer}}) {
  const {alphabet} = state.taskData;
  const {substitutions: subs, permutation, xor, and, decipheredLetters} = answer;
  const selectedAlphabet = state.frequencyAnalysis.textFrequencies;
  const substitutions = loadSubstitutions(alphabet, selectedAlphabet, subs);
  return update(state, {
    substitutions: {$set: substitutions},
    permutationText: {dump: {$set: permutation}},
    xorText: {dump: {$set: xor}},
    andText: {dump: {$set: and}},
    decipheredText: {decipheredLetters: {$set: decipheredLetters}}
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
