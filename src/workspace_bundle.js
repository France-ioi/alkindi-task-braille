
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
        <Collapsable title={<h2>{"Encrypted message"}</h2>}>
          <CipheredText />
        </Collapsable>
        <br />
        {addPerm && (<>
          <Collapsable title={<h2>{"Permutation"}</h2>}>
            <PermutatedText />
          </Collapsable>
          <br />
        </>)
        }
        {addXor && (<>
          <Collapsable title={<h2>{"XOR Mask"}</h2>}>
            <XORText />
          </Collapsable>
          <br />
        </>)
        }
        {addAnd && (<>
          <Collapsable title={<h2>{"AND Mask"}</h2>}>
            <ANDText />
          </Collapsable>
          <br />
        </>)
        }
        <Collapsable title={<h2>{"Frequency Analysis"}</h2>}>
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
        <Collapsable title={<h2>{"Hints"}</h2>}>
          <Hints />
        </Collapsable>
        <HintRequestFeedback />
        <br />
        <Collapsable title={<h2>{"Decrypted text"}</h2>}>
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
