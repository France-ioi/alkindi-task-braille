
import React, {useState} from 'react';
import classnames from 'classnames';
import {Collapse} from 'react-bootstrap';

export default React.memo(function Collapsable (props) {
  const [open, setOpen] = useState(true);
  const {title, children} = props;


  const newTitle = React.cloneElement(title, {
    onClick: () => setOpen(!open),
    children: [
      <i key="icon" className={classnames("collapse_anchor fa", open ? "fa fa-chevron-up" : "fa-chevron-down")}></i>,
      " ",
      title.props.children
    ]
  });


  return (
    <>
      {newTitle}
      <Collapse in={open}>
        <div>
          {children}
        </div>
      </Collapse>
    </>
  );
});
