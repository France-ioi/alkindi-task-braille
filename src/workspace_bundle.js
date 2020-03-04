
import React from 'react';
import {connect} from 'react-redux';
import {Alert} from 'react-bootstrap';
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
      version: {addPerm, addXor, addAnd, version},
      CipheredText, PermutatedText, XORText, ANDText, FrequencyAnalysis, Substitution, DecipheredText, HintRequestFeedback, Hints,
    } = this.props;
    return (
      <div>
        {
          parseFloat(version) < 10 && (
            <>
              <br />
              <Alert bsStyle="danger">
              Cette tentative utilise une ancienne version du sujet, qui contenait une faille non prévue. Si vous n'êtes pas en plein milieu d'une longue résolution de cette tentative, merci de travailler sur une nouvelle tentative pour utiliser la dernier version du sujet (qui sera celle utilisée au 3e tour).
              </Alert>
              <br />
            </>
          )
        }
        <Collapsable title={<h2>{"Message chiffré"}</h2>}>
          <CipheredText />
        </Collapsable>
        <br />
        {addPerm && (<>
          <Collapsable title={<h2>{"Permutation"}</h2>}>
            <br />
            <PermutatedText />
            <br />
          </Collapsable>
          <br />
        </>)
        }
        {addXor && (<>
          <Collapsable title={<h2>{"Masque XOR"}</h2>}>
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
