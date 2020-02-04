
import React, {useState} from 'react';
import classnames from 'classnames';
import {Collapse} from 'react-bootstrap';

export default React.memo(function Collapsable (props) {
  const [open, setOpen] = useState(true);
  const {title, children} = props;


  const newTitle = React.cloneElement(title, {
    onClick: () => setOpen(!open),
    children: [
      <i style={{position: 'relative', top: '-5px', fontSize: '20px'}} className={classnames("fa", open ? "fa fa-chevron-up" : "fa-chevron-down")}></i>,
      " ",
      title.props.children
    ]
  });


  return (
    <>
      {newTitle}
      {/* <h2 onClick={() => setOpen(!open)}><i style={{position: 'relative', top: '-5px', fontSize: '20px'}} className={classnames("fa", open ? "fa fa-chevron-up" : "fa-chevron-down")}></i> {title}</h2> */}
      <Collapse in={open}>
        <div>
          {children}
        </div>
      </Collapse>
    </>
  );
});
