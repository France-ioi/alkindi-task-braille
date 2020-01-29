
import React from 'react';
import {Button} from 'react-bootstrap';
import {connect} from 'react-redux';


class Hint1View extends React.PureComponent {
    render () {
        const {hintRequest: {isActive}, hintRequestData} = this.props;
        const customBorder = {display: "inline-grid", padding: "10px", border: "1px solid #000", width: "33%", background: "rgb(202, 202, 202)"};

        return (
            <div style={customBorder}>
                <p>
                    {"Pour un coût de "}
                    <span style={{fontWeight: "bold"}}>{'10 points'}</span>
                    {
                        ", cliquez sur une case du texte décrypté et validez pour obtenir sa valeur."
                    }
                </p>
                <div style={{textAlign: "center", margin: "10px 0"}}>
                    <Button onClick={this.requestHint} disabled={!hintRequestData || isActive}>{`Valider`}</Button>
                </div>
            </div>
        );
    }
    requestHint = () => {
        const {dispatch, requestHint, decipheredCellEditCancelled, hintRequestData} = this.props;
        hintRequestData.type = "type_1";
        dispatch({type: requestHint, payload: {request: hintRequestData}});
        dispatch({type: decipheredCellEditCancelled});

    };
}


class Hint2View extends React.PureComponent {
    constructor (props) {
        super(props);
        this.state = {index: ""};
    }
    render () {
        const {hintRequest: {isActive}, isAllHint} = this.props;
        const customBorder = {display: "inline-grid", padding: "10px", border: "1px solid #000", width: "33%", background: "rgb(202, 202, 202)", height: "146px", whiteSpace: 'pre-line'};
        customBorder.borderLeft = "0";

        return (
            <div style={customBorder}>
                <p>
                    {`
                        Demander tous les indices
                    `}
                </p>
                <div style={{textAlign: "center", margin: "10px 0", paddingTop: '10px'}}>
                    <Button onClick={this.requestHint} disabled={isActive || isAllHint}>{`Valider`}</Button>
                </div>
            </div>
        );
    }
    requestHint = () => {
        const {dispatch, requestHint, decipheredCellEditCancelled} = this.props;
        dispatch({type: requestHint, payload: {request: {type: "type_2"}}});
        dispatch({type: decipheredCellEditCancelled});

    };
}



function HintSelector (state) {
    const {hints} = state.taskData;
    const {
        actions: {requestHint, hintRequestFeedbackCleared, decipheredCellEditCancelled},
        hintRequest, editingDecipher,
        substitutions: {cells: substitutionCells},
        decipheredText: {decipheredLetters}
    } = state;
    let hintRequestData = null;
    if (typeof editingDecipher.cellRank === 'number') {
        const isHint =
        decipheredLetters[editingDecipher.cellRank] &&
        decipheredLetters[editingDecipher.cellRank].isHint !== undefined;

        const {locked} = substitutionCells[editingDecipher.symbol];
        if (!isHint && !locked) {
            hintRequestData = {cellRank: editingDecipher.cellRank};
        }
    }
    const isAllHint = (hints.length > 0 && (hints.map(({type}) => (type == 'type_2')).filter(bool => bool)).length !== 0) || false;

    return {
        requestHint, hintRequestFeedbackCleared,
        decipheredCellEditCancelled,
        isAllHint, hintRequest, hintRequestData
    };
}

class Hints extends React.PureComponent {
    render () {
        return (
            <div>
                <div style={{width: "100%", margin: "20px 0"}}>
                    <div style={{textAlign: "center"}}>

                        <Hint1View {...this.props} />
                        <Hint2View {...this.props} />
                    </div>
                </div>
            </div>);
    }
}

export default {
    views: {
        Hints: connect(HintSelector)(Hints)
    },
};
