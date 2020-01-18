
import React from 'react';
import {connect} from 'react-redux';

function WorkspaceSelector (state) {
  const {
    views: {CipheredText, PermutatedText, XORText, FrequencyAnalysis, Substitution, DecipheredText, HintRequestFeedback, Hints},
  } = state;

  return {
    CipheredText, PermutatedText, XORText, FrequencyAnalysis, Substitution, DecipheredText, HintRequestFeedback, Hints,
  };
}

class Workspace extends React.PureComponent {
  render () {
    const {
      CipheredText, PermutatedText, XORText, FrequencyAnalysis, Substitution, DecipheredText, HintRequestFeedback, Hints,
    } = this.props;
    return (
      <div>
        <h2>{"Encrypted message"}</h2>
        <CipheredText />
        <br />
        <h2>{"Permutation:"}</h2>
        <PermutatedText />
        <br />
        <h2>{"XOR Mask:"}</h2>
        <XORText />
        <br />
        <h2>{"Analyse de fréquence"}</h2>
        {/* <FrequencyAnalysis /> */}
        <h2>Substitution:</h2>
        <div className="clearfix">
          <div>
            {/* <Substitution index={0} /> */}
          </div>
        </div>
        {/* <Hints /> */}
        {/* <HintRequestFeedback /> */}
        <h2>{"Texte déchiffré"}</h2>
        {/* <DecipheredText /> */}
      </div>
    );
  }

}

export default {
  views: {
    Workspace: connect(WorkspaceSelector)(Workspace)
  }
};
