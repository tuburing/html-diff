import Match from "./match";
import { isEndOfTag, isWhitespace, isStartOfTag, isNotTag, isTag } from "./utils";

const htmlToWords = function (html: string) {
  let current_word: string = "";
  let mode: string = "char";
  const words = [];
  for (let i = 0, len = html.length; i < len; i++) {
    const char = html[i];
    switch (mode) {
      case "tag":
        if (isEndOfTag(char)) {
          current_word += ">";
          words.push(current_word);
          current_word = "";
          mode = isWhitespace(char) ? "whitespace" : "char"
        } else {
          current_word += char;
        }
        break;
      case "char":
        if (isStartOfTag(char)) {
          if (current_word) {
            words.push(current_word);
          }
          current_word = "<";
          mode = "tag";
        } else if (/\s/.test(char)) {
          if (current_word) {
            words.push(current_word);
          }
          current_word = char;
          mode = "whitespace";
        } else if (/[\w\#@]+/i.test(char)) {
          current_word += char;
        } else {
          if (current_word) {
            words.push(current_word);
          }
          current_word = char;
        }
        break;
      case "whitespace":
        if (isStartOfTag(char)) {
          if (current_word) {
            words.push(current_word);
          }
          current_word = "<";
          mode = "tag";
        } else if (isWhitespace(char)) {
          current_word += char;
        } else {
          if (current_word) {
            words.push(current_word);
          }
          current_word = char;
          mode = "char";
        }
        break;
      default:
        throw new Error(`Unknown mode ${mode}`);
    }
  }
  if (current_word) {
    words.push(current_word);
  }
  return words;
};

const findMatch = function (before_words: string[], after_words: string[], index_of_before_locations_in_after_words: any, start_in_before: number, end_in_before: number, start_in_after: number, end_in_after: number) {
  let best_match_in_before = start_in_before;
  let best_match_in_after = start_in_after;
  let best_match_length = 0;
  let match_length_at: any = {};
  let i;
  let ref;
  let match;
  for (
    let index_in_before = i = ref = start_in_before, ref1 = end_in_before;
    ref <= ref1 ? i < ref1 : i > ref1;
    index_in_before = ref <= ref1 ? ++i : --i
  ) {
    let new_match_length_at: any = {};
    let looking_for = before_words[index_in_before];
    let locations_in_after = index_of_before_locations_in_after_words[looking_for];
    for (let j = 0, len = locations_in_after.length; j < len; j++) {
      let index_in_after = locations_in_after[j];
      if (index_in_after < start_in_after) {
        continue;
      }
      if (index_in_after >= end_in_after) {
        break;
      }
      if (match_length_at[index_in_after - 1] == null) {
        match_length_at[index_in_after - 1] = 0;
      }
      let new_match_length = match_length_at[index_in_after - 1] + 1;
      new_match_length_at[index_in_after] = new_match_length;
      if (new_match_length > best_match_length) {
        best_match_in_before = index_in_before - new_match_length + 1;
        best_match_in_after = index_in_after - new_match_length + 1;
        best_match_length = new_match_length;
      }
    }
    match_length_at = new_match_length_at;
  }
  if (best_match_length !== 0) {
    match = new Match(
      best_match_in_before,
      best_match_in_after,
      best_match_length
    );
  }
  return match;
};

const recursivelyFindMatchingBlocks = function (before_words: any, after_words: any, index_of_before_locations_in_after_words: any, start_in_before: number, end_in_before: number, start_in_after: number, end_in_after: number, matching_blocks: any[]) {
  const match: any = findMatch(before_words, after_words, index_of_before_locations_in_after_words, start_in_before, end_in_before, start_in_after, end_in_after);
  if (match) {
    if (start_in_before < match.start_in_before && start_in_after < match.start_in_after) {
      recursivelyFindMatchingBlocks(before_words, after_words, index_of_before_locations_in_after_words, start_in_before, match.start_in_before, start_in_after, match.start_in_after, matching_blocks);
    }
    matching_blocks.push(match);
    if (match.end_in_before <= end_in_before && match.end_in_after <= end_in_after) {
      recursivelyFindMatchingBlocks(before_words, after_words, index_of_before_locations_in_after_words, match.end_in_before + 1, end_in_before, match.end_in_after + 1, end_in_after, matching_blocks);
    }
  }
  return matching_blocks;
};

const createIndex = function (p: { find_these: any, in_these: any }) {
  if (p.find_these == null) {
    throw new Error("params must have find_these key");
  }
  if (p.in_these == null) {
    throw new Error("params must have in_these key");
  }
  let index: any = {};
  const ref = p.find_these;
  for (let i = 0, len = ref.length; i < len; i++) {
    let token = ref[i];
    index[token] = [];
    let idx = p.in_these.indexOf(token);
    while (idx !== -1) {
      index[token].push(idx);
      idx = p.in_these.indexOf(token, idx + 1);
    }
  }
  return index;
};

const findMatchingBlocks = function (before_words: string[], after_words: string[]) {
  const matching_blocks: string[] = [];
  const index_of_before_locations_in_after_words = createIndex({ find_these: before_words, in_these: after_words });
  return recursivelyFindMatchingBlocks(before_words, after_words, index_of_before_locations_in_after_words, 0, before_words.length, 0, after_words.length, matching_blocks);
};

const isSingleWhitespace = function (before_words: string, op: { action: string; end_in_before: number; start_in_before: number; }) {
  if (op.action !== "equal") {
    return false;
  }
  if (op.end_in_before - op.start_in_before !== 0) {
    return false;
  }
  return /^\s$/.test(before_words.slice(op.start_in_before, +op.end_in_before + 1 || 9e9));
};

const calculateOperations = function (before_words: any, after_words: string[]) {
  if (!before_words || !before_words.length) {
    throw new Error("before_words?");
  }
  if (!after_words || !before_words.length) {
    throw new Error("after_words?");
  }
  let position_in_after = 0;
  let position_in_before = 0;
  const operations = [];
  const action_map: any = {
    "false,false": "replace",
    "true,false": "insert",
    "false,true": "delete",
    "true,true": "none"
  };
  let matches = findMatchingBlocks(before_words, after_words);
  matches.push(new Match(before_words.length, after_words.length, 0));
  for (let i = 0, len = matches.length; i < len; ++i) {
    let match = matches[i];
    let match_starts_at_current_position_in_before = position_in_before === match.start_in_before;
    let match_starts_at_current_position_in_after = position_in_after === match.start_in_after;
    let action_up_to_match_positions = action_map[[match_starts_at_current_position_in_before, match_starts_at_current_position_in_after].toString()];
    if (action_up_to_match_positions !== "none") {
      operations.push({
        action: action_up_to_match_positions,
        start_in_before: position_in_before,
        end_in_before:
          action_up_to_match_positions !== "insert"
            ? match.start_in_before - 1
            : void 0,
        start_in_after: position_in_after,
        end_in_after:
          action_up_to_match_positions !== "delete"
            ? match.start_in_after - 1
            : void 0
      });
    }
    if (match.length !== 0) {
      operations.push({
        action: "equal",
        start_in_before: match.start_in_before,
        end_in_before: match.end_in_before,
        start_in_after: match.start_in_after,
        end_in_after: match.end_in_after
      });
    }
    position_in_before = match.end_in_before + 1;
    position_in_after = match.end_in_after + 1;
  }
  let post_processed = [];
  let last_op = {
    end_in_before: 0,
    end_in_after: 0,
    action: "none"
  };

  for (let j = 0, len = operations.length; j < len; j++) {
    let op: any = operations[j];
    if (
      (isSingleWhitespace(before_words, op) && last_op.action === "replace") ||
      (op.action === "replace" && last_op.action === "replace")
    ) {
      last_op.end_in_before = op.end_in_before;
      last_op.end_in_after = op.end_in_after;
    } else {
      post_processed.push(op);
      last_op = op;
    }
  }
  return post_processed;
};

const consecutiveWhere = function (start: number, content: string, predicate: any) {
  content = content.slice(start, +content.length + 1 || 9e9);
  let last_matching_index = 0;
  let index = 0;
  for (let i = 0, len = content.length; i < len; index = ++i) {
    let token = content[index];
    let answer = predicate(token);
    if (answer === true) {
      last_matching_index = index;
    }
    if (answer === false) {
      break;
    }
  }
  if (last_matching_index) {
    return content.slice(0, +last_matching_index + 1 || 9e9);
  }
  return [];
};

const wrap = function (tag: string, content: string) {
  let rendering = "";
  let position = 0;
  let length = content.length;
  while (true) {
    if (position >= length) {
      break;
    }
    let non_tags: any = consecutiveWhere(position, content, isNotTag);
    position += non_tags.length;
    if (non_tags.length !== 0) {
      rendering += `<${tag}>${non_tags.join("")}</${tag}>`;
    }
    if (position >= length) {
      break;
    }
    let tags: any = consecutiveWhere(position, content, isTag);
    position += tags.length;
    rendering += tags.join("");
  }
  return rendering;
};

const opMap: any = {
  equal: function (op: { start_in_before: any; end_in_before: string | number; }, before_words: any[], after_words: any) {
    return before_words.slice(op.start_in_before, +op.end_in_before + 1 || 9e9).join("");
  },
  insert: function (op: { start_in_after: any; end_in_after: string | number; }, before_words: any, after_words: string | any[]) {
    const val: any = after_words.slice(op.start_in_after, +op.end_in_after + 1 || 9e9);
    return wrap("ins", val);
  },
  delete: function (op: { start_in_before: any; end_in_before: string | number; }, before_words: string | any[], after_words: any) {
    const val: any = before_words.slice(op.start_in_before, +op.end_in_before + 1 || 9e9);
    return wrap("del", val);
  },
  replace: function (op: any, before_words: any, after_words: any) {
    return (opMap.insert(op, before_words, after_words) + opMap.delete(op, before_words, after_words));
  }
};

const renderOperations = function (before_words: string[], after_words: string[], operations: any) {
  let rendering = "";
  for (let i = 0, len = operations.length; i < len; i++) {
    const op = operations[i];
    rendering += opMap[op.action](op, before_words, after_words);
  }
  return rendering;
};

const diff = function (before: string, after: string) {
  if (before === after) {
    return before;
  }
  let before_words = htmlToWords(before);
  let after_words = htmlToWords(after);
  const ops = calculateOperations(before_words, after_words);
  return renderOperations(before_words, after_words, ops);
};

export default diff;