
import React from 'react';
import {connect} from 'react-redux';
import Collapsable from './tools/collapsable';

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
        <Collapsable title={<h2>{"Message chiffré"}</h2>}>
          <CipheredText />
        </Collapsable>
        <br />
        {addPerm && (<>
          <Collapsable title={<h2>{"Permutation"}</h2>}>
            <br />
            <br />
            <PermutatedText />
            <br />
            <br />
          </Collapsable>
          <br />
        </>)
        }
        {addXor && (<>
          <Collapsable title={<h2>{"Masque XOR"}</h2>}>
            <br />
            <br />
            <XORText />
            <br />
          </Collapsable>
          <br />
        </>)
        }
        {addAnd && (<>
          <Collapsable title={<h2>{"Masque ET"}</h2>}>
            <div>
              <br />
              <br />
              <ANDText />
              <br />
            </div>
          </Collapsable>
          <br />
        </>)
        }
        <Collapsable title={<h2>{"Analyse de fréquences"}</h2>}>
          <FrequencyAnalysis />
        </Collapsable>
        <br />
        <Collapsable title={<h2>{"Substitution"}</h2>}>
          <div className="clearfix">
            <div>
              <Substitution />
            </div>
          </div>
        </Collapsable>
        <br />
        <Collapsable title={<h2>{"Indices"}</h2>}>
          <div>
            <Hints />
          </div>
        </Collapsable>
        <HintRequestFeedback />
        <br />
        <Collapsable title={<h2>{"Texte déchiffré"}</h2>}>
          <DecipheredText />
        </Collapsable>
      </div>
    );
  }

}

export default {
  views: {
    Workspace: connect(WorkspaceSelector)(Workspace)
  }
};
