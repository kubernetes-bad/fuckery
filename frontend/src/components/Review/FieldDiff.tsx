import { FC, memo, ReactNode } from 'react';
import { diffLines, formatLines } from 'unidiff';
import { Diff, Hunk, HunkData, markEdits, parseDiff, tokenize, TokenizeOptions, TokenNode } from 'react-diff-view';
import 'react-diff-view/style/index.css';
import './FieldDiff.css';

export type DefaultRenderToken = (token: TokenNode, index: number) => ReactNode;

const renderToken = (token: TokenNode, renderDefault: DefaultRenderToken, index: number): ReactNode => {
  switch (token.type) {
    case 'space':
      return (
        <span key={index} className="space">
          {token.children && token.children.map((token, index) => renderToken(token, renderDefault, index))}
        </span>
      );
    default:
      return renderDefault(token, index);
  }
};

const tk = (hunks: HunkData[]) => {
  if (!hunks) return undefined;

  const options: TokenizeOptions = {
    highlight: false,
    enhancers: [markEdits(hunks, { type: 'block' })],
  };

  try {
    return tokenize(hunks, options);
  } catch (ex) {
    return undefined;
  }
};

export type FieldDiffProps = {
  title: string;
  str1: string,
  str2: string,
}

export const FieldDiff: FC<FieldDiffProps> = memo(({ title, str1, str2 }) => {
  if (!str1 || !str2 || (str1 === 'null' && str2 === 'null')) return <></>;

  const diffText = formatLines(diffLines(str1, str2), { context: 3 });
  // if (!diffText) return <></>;
  const [{ type, hunks }] = parseDiff(diffText, { nearbySequences: 'zip' });
  const tokens = tk(hunks);

  return (
    <>
      <h3>{title}</h3>
      {hunks.length ?
        <Diff viewType='split'
          diffType={type}
          hunks={hunks || []}
          tokens={tokens}
          renderToken={renderToken}>
            {(hunks) => hunks.map((hunk) => <Hunk key={hunk.content} hunk={hunk}/>)}
        </Diff>
        : <code>{str1}</code>
      }
    </>
  );
});
