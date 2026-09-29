# The Loo York Times

The Loo York Times helps visitors discover eligible New York City restrooms while keeping source data, editorial decisions, and community contributions distinct.

## Language

**Restroom listing**:
The editorial record for one restroom that may be published to the public map and detail pages.
_Avoid_: Source row, submission

**Source row**:
One record received in an external restroom dataset, preserved with its import lineage and processing outcome. A source row is evidence for a restroom listing, not the listing itself.
_Avoid_: Restroom, listing

**Import batch**:
One immutable source-file snapshot whose rows are processed and reconciled together.
_Avoid_: Upload, dataset

**Eligibility decision**:
An editor's recorded determination that a restroom is city-operated or inside a city-owned building, including the supporting evidence.
_Avoid_: Operating status

**Operating status**:
The source's description of whether a restroom is operational, closed, or closed for construction. It does not establish ownership eligibility.
_Avoid_: Eligibility, publication status

**Publication status**:
The editorial state that determines whether a restroom listing appears publicly.
_Avoid_: Operating status, eligibility

**Submission**:
A signed-in contributor's proposed restroom and supporting eligibility explanation. It remains separate from any restroom listing created when editors approve it.
_Avoid_: Restroom, source row

**Review**:
A signed-in contributor's current star rating and optional comment for one restroom listing. A contributor has at most one review per listing and may revise it.
_Avoid_: Submission

**Contributor**:
An authenticated person who writes reviews or sends submissions.
_Avoid_: Reviewer, submitter

**Administrator**:
A contributor who has an explicit administrator role assignment and may make editorial decisions.
_Avoid_: Editor role
