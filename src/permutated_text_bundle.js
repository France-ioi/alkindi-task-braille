import React from 'react';
import classnames from 'classnames';
import {connect} from 'react-redux';
import ColumnsSeparators from './tools/column_sepatators';
import {elements, updateGridGeometry, updateGridVisibleRows, applyPermutation} from './utils';
import HTML5Backend from "react-dnd-html5-backend";
import {DndProvider, DragSource, DropTarget} from "react-dnd";
import {symSpecV1} from './symbols_bundle';
import Collapsable from './tools/collapsable';
const {RADIUS, BETWEEN_DOTS, BETWEEN_SYM_VT, BETWEEN_SYM_HZ} = symSpecV1();



function appInitReducer (state, _action) {
  return {
    ...state, permutationText: {
      cellWidth: 0,
      cellHeight: 0,
      scrollTop: 0,
      nbCells: 0,
      dump: {
        editedPairs: {}
      },
    }
  };
}

function taskInitReducer (state) {
  let {permutationText} = state;
  if (!permutationText) {
    return state;
  }
  const {cipherSymbols} = state.taskData;
  const {width, height} = state.symbols.sym3Normal;

  const permCells = elements.map((_v, i) => ({rank: i}));

  permutationText = {
    ...permutationText, permCells, cellWidth: width,
    cellHeight: height, cells: cipherSymbols, nbCells: cipherSymbols.length
  };
  permutationText = updateGridVisibleRows(permutationText);
  return {...state, permutationText};
}


function applyRefreshedData (permutationText) {
  let {cells, permCells, dump: {editedPairs}} = permutationText;
  const element = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  let perm = [...element];

  for (let key in editedPairs) {
    const target = editedPairs[key];
    key = parseInt(key);
    permCells[key] = target;
    if (key !== target.rank) {
      perm[key] = target.rank;
    }
  }

  cells = applyPermutation(cells, perm);
  permCells = [...permCells];
  return {...permutationText, cells, permCells};
}

function taskRefreshReducer (state) {
  let {permutationText} = state;
  if (!permutationText) {
    return state;
  }
  const {cipherSymbols} = state.taskData;

  permutationText = {...permutationText, cells: [...cipherSymbols], nbCells: cipherSymbols.length};
  permutationText = applyRefreshedData(permutationText);
  permutationText = updateGridGeometry(permutationText);
  permutationText = updateGridVisibleRows(permutationText);
  return {...state, permutationText};
}

function permutationTextResizedReducer (state, {payload: {width}}) {
  let {permutationText} = state;
  permutationText = {...permutationText, width};
  permutationText = updateGridGeometry(permutationText);
  permutationText = updateGridVisibleRows(permutationText);
  return {...state, permutationText};
}

function permutationTextScrolledReducer (state, {payload: {scrollTop}}) {
  let {permutationText} = state;
  permutationText = {...permutationText, scrollTop: Math.max(BETWEEN_SYM_VT / 2 - 5, scrollTop)};
  permutationText = updateGridVisibleRows(permutationText);
  return {...state, permutationText};
}


function permutationTextSwapPairsReducer (state, action) {
  let {permutationText} = state;

  let {editedPairs} = permutationText.dump;
  // drag-drop elements
  const {key1, value1, key2, value2} = action;
  if (key1 !== key2) {
    const target1 = {...editedPairs[key2], rank: value1};
    const target2 = {...editedPairs[key1], rank: value2};
    editedPairs = {...editedPairs, [key1]: target1, [key2]: target2};
    permutationText.dump = {editedPairs};
    const {cipherSymbols} = state.taskData;
    permutationText = {...permutationText, cells: [...cipherSymbols], nbCells: cipherSymbols.length};
    permutationText = applyRefreshedData(permutationText);

    permutationText = updateGridVisibleRows(permutationText);
  }

  return {...state, permutationText};
}

function permutationTextLockReducer (state, action) {
  let {permutationText} = state;
  let {editedPairs} = permutationText.dump;
  const {sourceRank, targetRank} = action;
  let target = editedPairs[sourceRank];
  if (target) {
    target = {...target, locked: !target.locked};
  } else {
    target = {rank: targetRank, locked: true};
  }
  editedPairs = {...editedPairs, [sourceRank]: target};
  permutationText.dump = {editedPairs};

  let {permCells} = permutationText;
  permCells[sourceRank] = target;
  permutationText.permCells = [...permCells];
  return {...state, permutationText};
}


function PermutationViewSelector (state) {
  const {actions, permutationText, symbols} = state;
  const {permutationTextResized, permutationTextScrolled, permutationTextSwapPairs, permutationTextLock} = actions;
  const {permCells, width, height, cellWidth, cellHeight, bottom, pageRows, pageColumns, visible, scrollTop} = permutationText;
  const {cells} = symbols.sym3Normal;
  return {
    permutationTextResized, permutationTextScrolled,
    permutationTextSwapPairs, permutationTextLock,
    permCells, width, height, visibleRows: visible.rows, cellWidth, cellHeight, bottom, pageRows, pageColumns, scrollTop,
    cells
  };
}

const BareSubstTarget = props => {

  const {
    target,
    isDragging,
    connectDropTarget,
    connectDragSource
  } = props;

  const isDragTarget = typeof connectDropTarget === "function";
  const isDragSource = typeof connectDragSource === "function";

  const classes = [
    'drop',
    isDragging && "dragging"
  ];

  const classesTxt = [
    'dd_txt',
    isDragSource && "dd_cell-draggable",
  ];

  let span = (<span className={classnames(classesTxt)}>{isDragging ? ' ' : target + 1}</span>);
  if (isDragSource) span = connectDragSource(span);

  let el = (
    <div className={classnames(classes)} >
      {span}
    </div>
  );

  if (isDragTarget) el = connectDropTarget(el);
  return el;
};

function sourceCollect (connect, monitor) {
  return {
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging()
  };
}

const targetCollect = function (connect, _monitor) {
  return {
    connectDropTarget: connect.dropTarget()
  };
};

const sourceSpec = {
  beginDrag: function (props) {
    const {source, target} = props;
    return {source, target};
  }
};

const targetSpec = {
  drop: function (props, monitor, _component) {
    const dragSource = monitor.getItem();
    const {source, target} = props;
    const dragTarget = {source, target};
    props.onDrop(dragSource, dragTarget);
  }
};

const SubstTarget = DragSource("subst-target", sourceSpec, sourceCollect)(
  DropTarget("subst-target", targetSpec, targetCollect)(BareSubstTarget)
);

class DDElement extends React.PureComponent {
  onLock = event => {
    const {source, target} = this.props;
    event.preventDefault();
    this.props.onLock(source, target);
  };

  render () {
    const {source, target, onDrop, isLocked} = this.props;
    const Target = !isLocked ? SubstTarget : BareSubstTarget;
    return (<div className="dd_cell">
      <Target
        source={source}
        target={target}
        onDrop={onDrop} />
      <i
        onClick={this.onLock}
        className={classnames(["lock", "fa", isLocked ? "fa-lock" : "fa-unlock-alt"])}
      />
    </div>);
  }
}

const dragTxts = [1, 2, 3, 4, 5, 6, 7, 8, 9];

class LinesSvg extends React.PureComponent {
  render () {
    const {permCells} = this.props;
    const lines = [];
    let x = 27 / 2;
    const posX = [x];
    for (let i = 1; i < 9; i++) {
      x += 47;
      if (i === 3 || i === 6) {
        x += 40;
      }
      posX.push(x);
    }
    const height = 80;
    for (let i = 0; i < permCells.length; i++) {
      lines.push(
        <line
          key={i}
          x1={`${posX[permCells[i].rank]}`}
          y1="0"
          x2={`${posX[i]}`}
          y2={`${height}`}
          stroke="black" />);
    }

    return (<div
      style={{
        width: '483px',
        height: `${height}px`,
        marginLeft: '98px'

      }}>
      <svg width='483px' height={`${height}px`}>
        {lines}
      </svg>
    </div>
    );
  }
}


class SymColLocksHighlighter extends React.PureComponent {
  render () {
    const {permCells, pageColumns, cellWidth, bottom} = this.props;
    const lines = [];
    for (let i = 0; i < permCells.length; i++) {
      if ("locked" in permCells[i] && permCells[i].locked) {
        const position = elements[i];
        const left = Math.ceil((BETWEEN_SYM_HZ / 2 - 3) - RADIUS / 2
          + position[1] * BETWEEN_DOTS + (2 * BETWEEN_DOTS * position[0])
          + position[0] * BETWEEN_SYM_HZ);
        for (let k = 0; k < pageColumns; k++) {
          lines.push(<span key={`${i}_${k}`} style={{
            position: 'absolute',
            left: `${left + k * cellWidth}px`,
            height: `${bottom}px`,
            borderLeft: `${(RADIUS * 2) + 4}px solid #cccccc69`,
          }}></span>);
        }
      }
    }
    return lines;
  }
}

const NumberHeader = () => {
  return (
    <div>
      {dragTxts.map((v, i) => <span key={i} className='dd_cell'><span className='dd_txt'>{v}</span></span>)}
    </div>
  );
};

class PermutaionTool extends React.PureComponent {
  render () {
    const {permCells, onLock, onDrop} = this.props;
    return (
      <div className="perm_wrapper">
        <div className="perm_line">
          <h4>Avant :</h4>
          <NumberHeader />
        </div>
        <LinesSvg permCells={permCells} />
        <div className="perm_line line2">
          <h4>Après :</h4>
          <DndProvider backend={HTML5Backend}>
            <div>
              {permCells.map((cell, i) => {
                const isLocked = "locked" in cell && cell.locked;
                return (
                  <DDElement key={i} source={i}
                    target={cell.rank}
                    isLocked={isLocked}
                    onLock={onLock}
                    onDrop={onDrop} />
                );
              })}
            </div>
          </DndProvider>
        </div>
      </div>
    );
  }
}

class PermutationView extends React.PureComponent {

  render () {
    const {permCells, width, height, pageColumns, visibleRows, cellWidth, cellHeight, bottom, cells} = this.props;
    return (
      <div>
        <PermutaionTool
          permCells={permCells}
          onLock={this.onPermLock}
          onDrop={this.onPermSwapPairs} />
        <Collapsable title={<h3>{"Résultat de la permutation"}</h3>}>
          <div
            ref={this.refTextBox}
            onScroll={this.onScroll}
            style={{
              position: 'relative',
              width: width && `${width}px`,
              height: height && `${height}px`,
              overflowX: 'scroll',
              border: '1px solid #000',

            }} >
            <ColumnsSeparators
              pageColumns={pageColumns}
              cellWidth={cellWidth}
              bottom={bottom}
            />
            {(visibleRows || [])
              .map(({index, columns}) =>
                (<div
                  key={index}
                  style={{
                    position: 'absolute',
                    top: `${index * cellHeight}px`,
                    padding: '4px'
                  }}>
                  {columns.map(({index, cell}) =>
                    cell ? (<svg
                      key={index}
                      className={`_${cell[0]}a _${cell[1]}b _${cell[2]}c`}
                      width={cellWidth}
                      height={cellHeight}
                      style={{
                        position: 'absolute',
                        left: `${index * cellWidth + 1}px`,
                        width: `${cellWidth}px`,
                        height: `${cellHeight}px`
                      }} >
                      {cells}
                    </svg>) : (<div key={index} style={{
                      position: 'absolute',
                      left: `${index * cellWidth + 1}px`,
                      width: `${cellWidth}px`,
                      height: `${cellHeight}px`
                    }}></div>)
                  )}
                </div>)
              )}
            <SymColLocksHighlighter
              permCells={permCells}
              pageColumns={pageColumns}
              cellWidth={cellWidth}
              bottom={bottom}
            />
            <div style={{
              position: 'absolute',
              top: `${bottom}px`,
              width: '1px',
              height: '1px'
            }} />
          </div>
        </Collapsable>
      </div >
    );
  }

  refTextBox = (element) => {
    this._textBox = element;
    const width = element.clientWidth;
    const height = element.clientHeight;
    this.props.dispatch({type: this.props.permutationTextResized, payload: {width, height}});
  };
  onScroll = () => {
    const scrollTop = this._textBox.scrollTop;
    this.props.dispatch({type: this.props.permutationTextScrolled, payload: {scrollTop}});
  };
  componentDidUpdate () {
    this._textBox.scrollTop = this.props.scrollTop;
  }
  onPermSwapPairs = (dragSource, dragTarget) => {
    const key1 = dragTarget.source;
    const value1 = dragSource.target;
    const key2 = dragSource.source;
    const value2 = dragTarget.target;
    this.props.dispatch({
      type: this.props.permutationTextSwapPairs,
      key1,
      value1,
      key2,
      value2
    });
  };
  onPermLock = (sourceRank, targetRank) => {
    this.props.dispatch({
      type: this.props.permutationTextLock,
      sourceRank,
      targetRank
    });
  };

}

export default {
  actions: {
    permutationTextSwapPairs: "permutationText.SwapPairs",
    permutationTextLock: "permutationText.Lock",
    permutationTextResized: 'permutationText.Resized' /* {width: number, height: number} */,
    permutationTextScrolled: 'permutationText.Scrolled' /* {scrollTop: number} */,
  },
  actionReducers: {
    appInit: appInitReducer,
    taskInit: taskInitReducer,
    taskRefresh: taskRefreshReducer,
    permutationTextResized: permutationTextResizedReducer,
    permutationTextScrolled: permutationTextScrolledReducer,
    permutationTextSwapPairs: permutationTextSwapPairsReducer,
    permutationTextLock: permutationTextLockReducer,
  },
  views: {
    PermutatedText: connect(PermutationViewSelector)(PermutationView),
  }
};
