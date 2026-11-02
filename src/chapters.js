// One place to change the colours of the whole book.
export const PALETTE = {
  cloth: '#2e3c72',   // book cover
  stitch: '#e9b44c',  // stitching and spine bands
  label: '#f6eedb',   // cover label
  paper: '#f6eedb',
  ink: '#27346b',     // handwriting
  typeInk: '#3b3631', // typewriter text
  red: '#c8402a',     // stamps
  rule: 'rgba(60,90,150,0.2)',
  tapes: ['#e9b44c', '#e98a6b', '#8fb9a0'],
};

// Each chapter: heading page design (left) and a very slight light tint.
export const CHAPTERS = [
  { n: 1, title: 'The Case of Bindu', tag: 'CASE FILE', doodle: 'magnifier', accent: '#c8402a', tint: '#f6eedb', light: '#ffe9c8' },
  { n: 2, title: 'Your Honour, We Have Evidence', tag: 'COURT RECORD', doodle: 'scales', accent: '#8c2f1d', tint: '#f4ecd6', light: '#fff4e0' },
  { n: 3, title: "Things You Probably Don't Notice", tag: 'OBSERVATION LOG', doodle: 'eye', accent: '#2f6f8f', tint: '#f1efe0', light: '#eaf0ff' },
  { n: 4, title: 'A Public Warning', tag: 'NOTICE TO THE PUBLIC', doodle: 'warning', accent: '#c8402a', tint: '#f8ebd0', light: '#ffe0c8' },
  { n: 5, title: 'Contradictions Department', tag: 'DEPARTMENT REPORT', doodle: 'arrows', accent: '#1f7a6d', tint: '#eef0e2', light: '#f0fff6' },
  { n: 6, title: 'Behind That Straight Face', tag: 'FIELD NOTES', doodle: 'face', accent: '#9a4f6a', tint: '#f5ebe0', light: '#ffe6d6' },
  { n: 7, title: 'If Life Had a Commentary Track', tag: 'COMMENTARY TRACK', doodle: 'speech', accent: '#d9731a', tint: '#fbf0c9', light: '#fff6c8' },
  { n: 8, title: 'Things Worth Keeping', tag: 'KEEPSAKES', doodle: 'envelope', accent: '#a8742a', tint: '#f2e7d0', light: '#ffe2b8' },
  { n: 9, title: 'A Page Without Sarcasm', tag: '', doodle: 'none', accent: '#27346b', tint: '#f8f3e6', light: '#ffffff' },
  { n: 10, title: 'The Unwritten Ending', tag: 'THE LAST PAGE', doodle: 'pencil', accent: '#27346b', tint: '#f3ead6', light: '#ffe9c8' },
];