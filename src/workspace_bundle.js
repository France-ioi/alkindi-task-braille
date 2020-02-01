
import React from 'react';
import {connect} from 'react-redux';

function WorkspaceSelector (state) {
  const {
    taskData: {version},
    views: {CipheredText, PermutatedText, XORText, ANDText, FrequencyAnalysis, Substitution, DecipheredText, HintRequestFeedback, Hints},
  } = state;

  return {
    version, CipheredText, PermutatedText, XORText, ANDText, FrequencyAnalysis, Substitution, DecipheredText, HintRequestFeedback, Hints,
  };
}

class Workspace extends React.PureComponent {
  render () {
    const {
      version: {addPerm, addXor, addAnd},
      CipheredText, PermutatedText, XORText, ANDText, FrequencyAnalysis, Substitution, DecipheredText, HintRequestFeedback, Hints,
    } = this.props;
    return (
      <div>
        <h2>{"Message chiffré"}</h2>
        <CipheredText />
        <br />
        {addPerm && (<>
          <h2>{"Permutation"}</h2>
          <PermutatedText />
          <br />
        </>)
        }
        {addXor && (<>
          <h2>{"Masque XOR"}</h2>
          <XORText />
          <br />
        </>)
        }
        {addAnd && (<>
          <h2>{"Masque ET"}</h2>
          <ANDText />
          <br />
        </>)
        }
        <h2>{"Analyse de fréquences"}</h2>
        <FrequencyAnalysis />
        <br />
        <h2>Substitution</h2>
        <div className="clearfix">
          <div>
            <Substitution />
          </div>
        </div>
        <br />
        <h2>Indices</h2>
        <Hints />
        <HintRequestFeedback />
        <br />
        <h2>{"Texte déchiffré"}</h2>
        <DecipheredText />
      </div>
    );
  }

}

export default {
  views: {
    Workspace: connect(WorkspaceSelector)(Workspace)
  }
};
