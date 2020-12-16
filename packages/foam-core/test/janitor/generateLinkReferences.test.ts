import * as path from 'path';
import { NoteGraphAPI, GraphNote } from '../../src/note-graph';
import { generateLinkReferences } from '../../src/janitor';
import { bootstrap } from '../../src/bootstrap';
import { createConfigFromFolders } from '../../src/config';
import { Services } from '../../src';
import { FileDataStore } from '../../src/services/datastore';
import { Logger } from '../../src/utils/log';
import { URI } from '../../src/common/uri';

Logger.setLevel('error');

describe('generateLinkReferences', () => {
  let _graph: NoteGraphAPI;

  beforeAll(async () => {
    const config = createConfigFromFolders([
      URI.file(path.join(__dirname, '..', '__scaffold__')),
    ]);
    const services: Services = {
      dataStore: new FileDataStore(config),
    };
    _graph = await bootstrap(config, services).then(foam => foam.notes);
  });

  it('initialised test graph correctly', () => {
    expect(_graph.getNotes().length).toEqual(6);
  });

  it('should add link references to a file that does not have them', () => {
    const note = _graph.getNotes({ slug: 'index' })[0];
    const expected = {
      newText: textForNote(
        note,
        `
[//begin]: # "Autogenerated link references for markdown compatibility"
[first-document]: first-document "First Document"
[second-document]: second-document "Second Document"
[file-without-title]: file-without-title "file-without-title"
[//end]: # "Autogenerated link references"`
      ),
      range: {
        start: pointForNote(note, {
          line: 10,
          column: 1,
          offset: 140,
        }),
        end: pointForNote(note, {
          line: 10,
          column: 1,
          offset: 140,
        }),
      },
    };

    const actual = generateLinkReferences(note, _graph, false);

    expect(actual!.range.start).toEqual(expected.range.start);
    expect(actual!.range.end).toEqual(expected.range.end);
    expect(actual!.newText).toEqual(expected.newText);
  });

  it('should remove link definitions from a file that has them, if no links are present', () => {
    const note = _graph.getNotes({ slug: 'second-document' })[0];

    const expected = {
      newText: '',
      range: {
        start: pointForNote(note, {
          line: 7,
          column: 1,
          offset: 105,
        }),
        end: pointForNote(note, {
          line: 9,
          column: 43,
          offset: 269,
        }),
      },
    };

    const actual = generateLinkReferences(note, _graph, false);

    expect(actual!.range.start).toEqual(expected.range.start);
    expect(actual!.range.end).toEqual(expected.range.end);
    expect(actual!.newText).toEqual(expected.newText);
  });

  it('should update link definitions if they are present but changed', () => {
    const note = _graph.getNotes({ slug: 'first-document' })[0];

    const expected = {
      newText: textForNote(
        note,
        `[//begin]: # "Autogenerated link references for markdown compatibility"
[file-without-title]: file-without-title "file-without-title"
[//end]: # "Autogenerated link references"`
      ),
      range: {
        start: pointForNote(note, {
          line: 9,
          column: 1,
          offset: 145,
        }),
        end: pointForNote(note, {
          line: 11,
          column: 43,
          offset: 312,
        }),
      },
    };

    const actual = generateLinkReferences(note, _graph, false);

    expect(actual!.range.start).toEqual(expected.range.start);
    expect(actual!.range.end).toEqual(expected.range.end);
    expect(actual!.newText).toEqual(expected.newText);
  });

  it('should not cause any changes if link reference definitions were up to date', () => {
    const note = _graph.getNotes({ slug: 'third-document' })[0];

    const expected = null;

    const actual = generateLinkReferences(note, _graph, false);

    expect(actual).toEqual(expected);
  });
});

/**
 * Will adjust a text line separator to match
 * what is used by the note
 * Necessary when running tests on windows
 *
 * @param note the note we are adjusting for
 * @param text starting text, using a \n line separator
 */
function textForNote(note: GraphNote, text: string): string {
  return text.split('\n').join(note.source.eol);
}

/**
 * Will adjust a point to take into account the EOL length
 * of the note
 * Necessary when running tests on windows
 *
 * @param note the note we are adjusting for
 * @param pos starting position
 */
function pointForNote(
  note: GraphNote,
  pos: { line: number; column: number; offset: number }
) {
  const rows = pos.line - 1;
  return {
    ...pos,
    offset: pos.offset - rows + rows * note.source.eol.length,
  };
}
