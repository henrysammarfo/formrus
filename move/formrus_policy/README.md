# FORMRUS Seal Access Policy

This Sui Move package provides the on-chain access policy used by Seal key servers for private FORMRUS responses.

The package creates:

- A shared `AccessPolicy` object containing per-form admin records.
- A `register_form(policy, form_id, admins, ctx)` function for creating one private-form access record.
- `add_form_admin` and `remove_form_admin` functions scoped to the form creator.
- A `seal_approve(id, policy, ctx)` function that aborts unless the transaction sender is approved for that exact form identity. The identity `id` is the first argument to match Seal's approval-function convention.

Each form record has its own creator/admin set. The Walrus Sessions reviewer address should be included in the `admins` vector when registering the specific hackathon submission form:

```text
0xc4d6ee019649edba41d5a5ed1081fe3c86afc41fea413195dd6ecdd0f6090e54
```

## Build

```powershell
sui move build --path move/formrus_policy
```

## Publish

Use a funded Sui mainnet wallet whose recovery phrase has never been shared.

```powershell
sui client switch --env mainnet
sui client publish move/formrus_policy --gas-budget 100000000
```

After publish, copy:

- The published package ID.
- The created shared `AccessPolicy` object ID.

The current mainnet deployment metadata is recorded in `mainnet-deployment.json`.

Set FORMRUS env:

```env
VITE_SEAL_PACKAGE_ID=0xPACKAGE_ID
VITE_SEAL_APPROVE_TARGET=0xPACKAGE_ID::formrus_policy::seal_approve
VITE_SEAL_REGISTER_TARGET=0xPACKAGE_ID::formrus_policy::register_form
VITE_SEAL_ADD_ADMIN_TARGET=0xPACKAGE_ID::formrus_policy::add_form_admin
VITE_SEAL_APPROVE_POLICY_OBJECT_ID=0xACCESS_POLICY_OBJECT_ID
VITE_SEAL_APPROVE_ARGUMENTS=id,policy
```
