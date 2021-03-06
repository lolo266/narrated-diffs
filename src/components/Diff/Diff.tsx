import { throttle } from "lodash";
import flatMap from "lodash/flatMap";
import parseDiff from "parse-diff";
import React, { Component } from "react";
import { SortableContainer, arrayMove } from "react-sortable-hoc";

import { File } from "../File/File";
import "./Diff.css";

const { REACT_APP_SERVER_URL } = process.env;

const HIDDEN_FILES = ["package-lock.json", "yarn.lock"];

const DiffBase = SortableContainer(
  ({
    diff = [],
    readOnly,
    changeDescription,
    moveToTop,
    moveToBottom,
  }: {
    diff: DiffFile[];
    readOnly: boolean;
    changeDescription: (
      from: string,
      to: string,
      chunkIndex: number,
      description: string
    ) => void;
    moveToTop: (index: number) => void;
    moveToBottom: (index: number) => void;
  }) => (
    <div className="diff">
      {diff.map(({ from, to, chunks, chunkIndex, description }, index) => {
        if (HIDDEN_FILES.includes(from) || HIDDEN_FILES.includes(to)) {
          return null;
        }

        return (
          <File
            key={`${from}-${to}-${chunkIndex}`}
            readOnly={readOnly}
            description={description}
            changeDescription={changeDescription}
            chunkIndex={chunkIndex}
            moveToTop={moveToTop}
            moveToBottom={moveToBottom}
            index={index}
            eltIndex={index}
            {...{ from, to, chunks }}
          />
        );
      })}
      <p>
        Icons made by{" "}
        <a href="https://www.flaticon.com/authors/freepik" title="Freepik">
          Freepik
        </a>
      </p>
    </div>
  )
);

type DiffFile = {
  from: string;
  to: string;
  chunkIndex: number;
  description: string;
  chunks: parseDiff.Chunk[];
};

export class Diff extends Component<{ readOnly?: boolean; id: string }> {
  state: { diff: DiffFile[]; loading: boolean } = { diff: [], loading: false };

  async componentDidMount() {
    this.setState({ loading: true });

    const { id } = this.props;
    const response = await fetch(`${REACT_APP_SERVER_URL}/diffs/${id}`);
    const { diff } = await response.json();
    this.setState({ id, diff, loading: false });
  }

  persistDiff = throttle(async () => {
    const { id } = this.props;
    const { diff } = this.state;
    return fetch(`${REACT_APP_SERVER_URL}/diffs/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, diff }),
    });
  }, 1000);

  onSortEnd = ({
    oldIndex,
    newIndex,
  }: {
    oldIndex: number;
    newIndex: number;
  }) => {
    console.log(oldIndex, newIndex);
    this.setState(
      {
        diff: arrayMove(this.state.diff, oldIndex, newIndex),
      },
      () => {
        this.persistDiff();
      }
    );
  };

  moveToTop = (oldIndex: number) => this.onSortEnd({ oldIndex, newIndex: 0 });
  moveToBottom = (oldIndex: number) =>
    this.onSortEnd({ oldIndex, newIndex: this.state.diff.length - 1 });

  setDiff = (rawDiff: string) => {
    const parsedDiff = parseDiff(rawDiff);
    const diff = flatMap(parsedDiff, ({ from, to, chunks }: parseDiff.File) => {
      return chunks.map((chunk, chunkIndex) => ({
        from,
        to,
        chunks: [chunk],
        chunkIndex,
        description: "",
      }));
    });
    this.setState({ diff }, () => {
      this.persistDiff();
    });
  };

  changeDescription = (
    from: string,
    to: string,
    chunkIndex: number,
    description: string
  ) => {
    const file = this.state.diff.find((f) => {
      return f.from === from && f.to === to && f.chunkIndex === chunkIndex;
    });

    if (!file) {
      throw new Error(
        `Couldn't find a file with from = ${from}, to = ${to}, and chunkIndex = ${chunkIndex}`
      );
    }

    file.description = description;
    this.setState({ diff: this.state.diff }, () => {
      this.persistDiff();
    });
  };

  render() {
    const { loading, diff } = this.state;

    return loading ? (
      <div className="diff">
        <p>Loading...</p>
      </div>
    ) : (
      <DiffBase
        readOnly={!!this.props.readOnly}
        diff={diff}
        onSortEnd={this.onSortEnd}
        changeDescription={this.changeDescription}
        moveToTop={this.moveToTop}
        moveToBottom={this.moveToBottom}
        useDragHandle
      />
    );
  }
}
