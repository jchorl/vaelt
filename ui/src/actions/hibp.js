import { List } from "immutable";
import { crypto, enums } from "openpgp";
import { reqFailure, stringResponse } from "./parseResponse";

export const HIBP_SUCCESS = "HIBP_SUCCESS";
function hibpSuccess(resp) {
  // response has "suffix:count" form, and is many lines
  const suffixSet = List(resp.split("\n"))
    // split suffix from count
    .map(suffixCount => suffixCount.split(":"))
    // pluck the suffix
    .map(suffixCount => suffixCount[0])
    .map(suffix => suffix.toLowerCase())
    .toSet();
  return {
    type: HIBP_SUCCESS,
    suffixSet,
  };
}

export const HIBP_FAILURE = "HIBP_FAILURE";
function hibpFailure(error) {
  return {
    type: HIBP_FAILURE,
    error,
  };
}

export function checkPasswords(plaintexts) {
  return async function(dispatch) {
    const encoder = new TextEncoder();

    const hashesByFirstFive = plaintexts
      .map(plaintext => [encoder.encode(plaintext), plaintext])
      .map(([encoded, plaintext]) => [
        crypto.hash.digest(enums.hash.sha1, encoded),
        plaintext,
      ])
      .map(([encodedHash, plaintext]) => [
        Buffer.from(encodedHash).toString("hex"),
        plaintext,
      ])
      .groupBy(([hash]) => hash.substring(0, 5));

    const groupedPlaintexts = await Promise.all(
      hashesByFirstFive
        .entrySeq()
        .map(([firstFive, listOfHashPlaintextPairs]) =>
          fetch(`https://api.pwnedpasswords.com/range/${firstFive}`)
            .then(
              stringResponse(dispatch, hibpSuccess, hibpFailure),
              reqFailure
            )
            // get plaintexts where the hash suffix is in the suffix set
            .then(({ suffixSet }) =>
              listOfHashPlaintextPairs
                .filter(([hash, plaintext]) =>
                  suffixSet.contains(hash.substring(5).toLowerCase())
                )
                .map(([, plaintext]) => plaintext)
            )
        )
    );

    return List(groupedPlaintexts).flatten(1);
  };
}
