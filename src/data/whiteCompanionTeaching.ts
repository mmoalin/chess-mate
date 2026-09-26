/** Editorial explanations for the exact assessed main and transfer positions. */
export const companionTeaching: Record<string, { main: string[]; transfer: string[] }> = {
  'white-sicilian-alapin/main': {
    main: ['Develop the king knight and reinforce d4 before trying to chase the queen.', 'Bring the c1 bishop out to support d4. Both sides are developing against the queen’s central placement.', 'Taking c5 changes the centre and opens the d-file. Calculate the queen exchange before counting the extra pawn.', 'Recapture the checking queen with the king. Castling is no longer available, but queens have gone; develop the remaining pieces and find a safe king square.'],
    transfer: ['With c3 occupied, the queen knight can develop via a3 toward b5 or c4. Black’s e6 setup calls for a different route.', 'The knight jumps from a3 with pressure on d4 and c7. Recover the pawn through activity, checking Black’s next developing move.']
  },
  'white-sicilian-alapin/nf6': {
    main: ['Develop the king knight to support the centre before deciding which pawn to recapture.', 'Resolve the contact on d6; leaving the advanced pawn does not preserve the original chain indefinitely.', 'The knight recaptures on d4 with central activity. The pawn on d6 remains exposed to the queen.', 'The c3 pawn occupies the natural c3 square, so the other knight develops through a3. Prepare useful central squares rather than moving the queen early.'],
    transfer: ['Black developed the queen knight before …d6. Recapture with the c-pawn to keep the two-pawn centre supported.', 'Develop the bishop toward the central knight and f7. The changed move order allows active bishop development before committing the other knight.']
  },
  'white-sicilian-alapin/nc6': {
    main: ['Exchange on d5 to answer the counterstrike. Maintaining two central pawns is less important than resolving the concrete pressure.', 'Develop the king knight toward the centre and prepare castling. Black’s queen can be challenged by later development.', 'Interpose the bishop to reduce the effect of the pin, while clearing the way to castle.', 'The c-pawn has moved to d4, leaving c3 available. Develop the queen knight with a tempo against the queen.'],
    transfer: ['Black develops with …Nf6 instead of pinning the knight. Develop Nc3 with a tempo against the queen on d5.', 'After the queen moves to f5, advance d4–d5 to attack the c6 knight. The queen no longer blockades that square; use the changed placement before copying the main setup.']
  },
  'white-sicilian-alapin/d6': {
    main: ['The bishop develops and protects e4 at the same time. Deal with the knight’s threat before treating …d6 as passive.', 'Develop the king knight to support d4 and prepare castling against the fianchetto.', 'Control g4 before castling, restricting a bishop or knight approach. This useful move depends on the centre being supported.', 'Secure the king and connect a rook to the centre. Black’s g7 bishop means d4 still needs attention.'],
    transfer: ['Black exchanges on d4 immediately. Recapture with the c-pawn to restore the centre.', 'Black’s …e5 closes the centre and controls f4. Develop the king knight through e2 without obstructing the bishop on d3.']
  },
  'white-french-advance/main': {
    main: ['Prepare queenside expansion with a supporting pawn. Black can close the wing with …c4, so this is a structural choice rather than a free attacking tempo.', 'The queen knight develops through d2 because c3 supports d4. It helps reinforce the centre after Black closes the queenside.', 'Move the rook behind the b-pawn to prepare expansion. The queen on b6 makes the support for b2 important.', 'Gain kingside space while the centre is closed. The h-pawn advance is part of this particular position, not permission to ignore future central breaks.'],
    transfer: ['With …Bd7 rather than …c4, the supported b-pawn advance gains queenside space. Be ready to restore the centre after a capture.', 'Recapture on d4 with the c-pawn. Queenside expansion has not removed Black’s pressure against the chain.']
  },
  'white-french-advance/exchange': {
    main: ['Recapture with the c-pawn to restore d4. The c-file opens and the shape of the chain changes.', 'Develop the king knight to support d4 and e5. Black can increase pressure with a knight on f5.', 'Develop the bishop toward the kingside while watching the route from e7 to f5.', 'Exchange the knight that increases pressure against d4. Black’s e-pawn recaptures on f5, changing the central structure and opening the e-file.'],
    transfer: ['Black develops the king knight first. Develop your own king knight and keep d4 supported.', 'Develop the bishop after Black’s second knight joins the centre. The order changed, but the pressure on d4 still guides development.']
  },
  'white-french-advance/bd7': {
    main: ['Develop the bishop to a safe square and prepare castling. Do not start a wing attack before the king is secure.', 'Castle while the pawn chain still shields the centre. Black can exchange on d4 next.', 'Recapture on d4 with the c-pawn, preserving the centre while opening c3 for the knight.', 'Use the newly available c3 square to develop the queen knight and help defend d4.'],
    transfer: ['The early exchange requires a recapture before castling. Restore d4 with the c-pawn.', 'Develop the queen knight through the square vacated by the c-pawn. Recheck the defenders of d4 after every exchange.']
  },
  'white-french-advance/f6': {
    main: ['Pin the c6 knight to the king before resolving the pawn tension. Black must account for this piece contact as well as the e5 pawn.', 'Exchange the c6 knight, removing a piece that pressures d4. Black’s bishop recapture changes the diagonal toward the kingside.', 'Castle before further central lines open. The pawn break is a reason to secure the king promptly.', 'Place a rook on the e-file behind the advanced pawn. Calculate central captures before assuming the file is open.'],
    transfer: ['Black’s queen move does not remove the pin on c6. Exchange with check and account for the queen recapture.', 'Castle after the checking exchange. The queen on c6 changes Black’s pressure, so reassess rather than copying a long forcing line.']
  },
  'white-caro-exchange/main': {
    main: ['Develop the c1 bishop actively before moving the king knight. The centre is stable enough to improve pieces.', 'Use the queen to pressure b7 and d5 while supporting your own queenside. Count the defenders before taking either pawn.', 'Develop the queen knight through d2 because c3 supports d4. This also gives the king knight access to f3 without blocking that route.', 'Develop the king knight to f3, completing coordination before castling. Identify which knight is moving when both can reach the square.'],
    transfer: ['Black chooses a fianchetto instead of …Bg4. Develop the king knight and keep the centre supported.', 'The knight attacks the bishop from h5. Retreat the bishop to e3 where it contributes to the centre rather than losing time on a speculative attack.']
  },
  'white-caro-exchange/bf5': {
    main: ['Capture the undefended bishop on f5. Black has no pawn or piece that can recapture; this premature …Bf5 is a tactical error.', 'Develop the king knight while retaining the extra piece. Winning material does not make king safety optional.', 'Bring the bishop back toward the centre before it becomes a target. Consolidation is more useful than another speculative pawn grab.', 'Castle to secure the king. The objective is to convert the extra piece through normal development and safe exchanges.'],
    transfer: ['Black develops the king knight after losing the bishop. Support d4 with c3 before completing development.', 'Develop the king knight and prepare castling. Continue checking threats even with a material advantage.']
  },
  'white-caro-exchange/bg4': {
    main: ['Develop the other bishop actively while maintaining central support. The f3 knight remains pinned to the queen.', 'Castle to secure the king before resolving the bishop contacts. Count central defenders with the pin in mind.', 'Exchange Black’s active bishop on d6. The queen recapture changes the pressure and clears the diagonal.', 'Question the bishop on g4 and be prepared for a capture on f3. A pawn question does not force a retreat.'],
    transfer: ['Black spends a tempo on …a6. Question the pinning bishop while checking whether an exchange would help either side.', 'After the bishop retreats to h5, develop the queen knight through d2. The pin still matters, so increase central support.']
  },
  'white-caro-exchange/g6': {
    main: ['Develop the king knight and prepare castling. The g7 bishop will contest central squares rather than copy the normal …e7 setup.', 'Castle before increasing the pressure in the centre. Do not treat the queen move as a reason for a premature attack.', 'Develop the queen knight via a3 because the c-pawn occupies c3. It can later reassess access to b5 or c2.', 'Bring the rook to the e-file, coordinating with the bishop and knight. The centre and Black’s long diagonal determine when exchanges help.'],
    transfer: ['Black develops the queen knight before the queen. Castle while d4 remains supported.', 'Restrict g4 after Black completes the fianchetto. The move is useful here because development and central support are already in place.']
  }
};
