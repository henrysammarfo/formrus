module formrus_policy::formrus_policy;

use sui::event;
use sui::table::{Self as table, Table};
use sui::vec_set::{Self as vec_set, VecSet};

const EFormAlreadyRegistered: u64 = 1;
const EFormNotRegistered: u64 = 2;
const ENotFormCreator: u64 = 3;
const ECreatorCannotBeRemoved: u64 = 4;
const ENotFormAdmin: u64 = 5;

public struct AccessPolicy has key {
    id: UID,
    forms: Table<vector<u8>, FormAccess>,
}

public struct FormAccess has store {
    creator: address,
    admins: VecSet<address>,
}

public struct FormRegistered has copy, drop {
    form_id: vector<u8>,
    creator: address,
}

public struct FormAdminAdded has copy, drop {
    form_id: vector<u8>,
    admin: address,
}

public struct FormAdminRemoved has copy, drop {
    form_id: vector<u8>,
    admin: address,
}

fun init(ctx: &mut TxContext) {
    transfer::share_object(AccessPolicy {
        id: object::new(ctx),
        forms: table::new(ctx),
    });
}

public fun form_exists(policy: &AccessPolicy, form_id: vector<u8>): bool {
    table::contains(&policy.forms, form_id)
}

public fun is_form_admin(policy: &AccessPolicy, form_id: vector<u8>, admin: address): bool {
    if (!table::contains(&policy.forms, form_id)) {
        return false
    };

    let form = table::borrow(&policy.forms, form_id);
    form.creator == admin || form.admins.contains(&admin)
}

public fun form_creator(policy: &AccessPolicy, form_id: vector<u8>): address {
    assert!(table::contains(&policy.forms, form_id), EFormNotRegistered);
    table::borrow(&policy.forms, form_id).creator
}

/// Registers a private FORMRUS form identity. The transaction sender becomes
/// the form creator and can later manage that form's admin allowlist.
public fun register_form(
    policy: &mut AccessPolicy,
    form_id: vector<u8>,
    mut admins: vector<address>,
    ctx: &TxContext,
) {
    assert!(!table::contains(&policy.forms, form_id), EFormAlreadyRegistered);

    let creator = tx_context::sender(ctx);
    let mut admin_set = vec_set::empty<address>();
    admin_set.insert(creator);

    while (!admins.is_empty()) {
        let admin = admins.pop_back();
        if (!admin_set.contains(&admin)) {
            admin_set.insert(admin);
        };
        event::emit(FormAdminAdded { form_id, admin });
    };

    table::add(&mut policy.forms, form_id, FormAccess {
        creator,
        admins: admin_set,
    });

    event::emit(FormRegistered { form_id, creator });
}

public fun add_form_admin(policy: &mut AccessPolicy, form_id: vector<u8>, admin: address, ctx: &TxContext) {
    assert!(table::contains(&policy.forms, form_id), EFormNotRegistered);

    let form = table::borrow_mut(&mut policy.forms, form_id);
    assert!(tx_context::sender(ctx) == form.creator, ENotFormCreator);

    if (!form.admins.contains(&admin)) {
        form.admins.insert(admin);
        event::emit(FormAdminAdded { form_id, admin });
    };
}

public fun remove_form_admin(policy: &mut AccessPolicy, form_id: vector<u8>, admin: address, ctx: &TxContext) {
    assert!(table::contains(&policy.forms, form_id), EFormNotRegistered);

    let form = table::borrow_mut(&mut policy.forms, form_id);
    assert!(tx_context::sender(ctx) == form.creator, ENotFormCreator);
    assert!(admin != form.creator, ECreatorCannotBeRemoved);

    if (form.admins.contains(&admin)) {
        form.admins.remove(&admin);
        event::emit(FormAdminRemoved { form_id, admin });
    };
}

/// Seal key servers dev-inspect a PTB that calls this function. Per Seal
/// convention, the first argument must be the requested identity without the
/// package ID prefix. If the connected wallet is not approved for this exact
/// form identity, the PTB aborts and no decrypt key shares are released.
entry fun seal_approve(form_id: vector<u8>, policy: &AccessPolicy, ctx: &TxContext) {
    assert!(is_form_admin(policy, form_id, tx_context::sender(ctx)), ENotFormAdmin);
}

#[test_only]
use sui::test_scenario::{Self as test_scenario, Scenario};

#[test_only]
const CREATOR: address = @0xA;
#[test_only]
const ADMIN: address = @0xB;
#[test_only]
const SECOND_ADMIN: address = @0xC;
#[test_only]
const OUTSIDER: address = @0xD;

#[test_only]
fun setup_policy(creator: address): Scenario {
    let mut scenario = test_scenario::begin(creator);
    init(scenario.ctx());
    scenario.next_tx(creator);
    scenario
}

#[test]
fun register_form_authorizes_creator_and_admins() {
    let mut scenario = setup_policy(CREATOR);
    let mut policy = scenario.take_shared<AccessPolicy>();

    register_form(&mut policy, b"form-alpha", vector[ADMIN], scenario.ctx());

    assert!(form_exists(&policy, b"form-alpha"), 0);
    assert!(form_creator(&policy, b"form-alpha") == CREATOR, 1);
    assert!(is_form_admin(&policy, b"form-alpha", CREATOR), 2);
    assert!(is_form_admin(&policy, b"form-alpha", ADMIN), 3);
    assert!(!is_form_admin(&policy, b"form-alpha", OUTSIDER), 4);

    seal_approve(b"form-alpha", &policy, scenario.ctx());
    test_scenario::return_shared(policy);

    scenario.next_tx(ADMIN);
    let policy = scenario.take_shared<AccessPolicy>();
    seal_approve(b"form-alpha", &policy, scenario.ctx());
    test_scenario::return_shared(policy);

    scenario.end();
}

#[test]
fun creator_can_add_and_remove_admins() {
    let mut scenario = setup_policy(CREATOR);
    let mut policy = scenario.take_shared<AccessPolicy>();

    register_form(&mut policy, b"form-admin-edit", vector[ADMIN], scenario.ctx());
    add_form_admin(&mut policy, b"form-admin-edit", SECOND_ADMIN, scenario.ctx());

    assert!(is_form_admin(&policy, b"form-admin-edit", SECOND_ADMIN), 0);

    remove_form_admin(&mut policy, b"form-admin-edit", SECOND_ADMIN, scenario.ctx());

    assert!(!is_form_admin(&policy, b"form-admin-edit", SECOND_ADMIN), 1);
    assert!(is_form_admin(&policy, b"form-admin-edit", CREATOR), 2);

    test_scenario::return_shared(policy);
    scenario.end();
}

#[test]
#[expected_failure(abort_code = EFormAlreadyRegistered)]
fun duplicate_form_registration_is_rejected() {
    let mut scenario = setup_policy(CREATOR);
    let mut policy = scenario.take_shared<AccessPolicy>();

    register_form(&mut policy, b"form-duplicate", vector[ADMIN], scenario.ctx());
    register_form(&mut policy, b"form-duplicate", vector[ADMIN], scenario.ctx());

    test_scenario::return_shared(policy);
    scenario.end();
}

#[test]
#[expected_failure(abort_code = ENotFormCreator)]
fun non_creator_cannot_add_admin() {
    let mut scenario = setup_policy(CREATOR);
    let mut policy = scenario.take_shared<AccessPolicy>();

    register_form(&mut policy, b"form-creator-only", vector[ADMIN], scenario.ctx());
    test_scenario::return_shared(policy);

    scenario.next_tx(ADMIN);
    let mut policy = scenario.take_shared<AccessPolicy>();
    add_form_admin(&mut policy, b"form-creator-only", SECOND_ADMIN, scenario.ctx());

    test_scenario::return_shared(policy);
    scenario.end();
}

#[test]
#[expected_failure(abort_code = ECreatorCannotBeRemoved)]
fun creator_cannot_remove_self() {
    let mut scenario = setup_policy(CREATOR);
    let mut policy = scenario.take_shared<AccessPolicy>();

    register_form(&mut policy, b"form-creator-stays", vector[ADMIN], scenario.ctx());
    remove_form_admin(&mut policy, b"form-creator-stays", CREATOR, scenario.ctx());

    test_scenario::return_shared(policy);
    scenario.end();
}

#[test]
#[expected_failure(abort_code = ENotFormAdmin)]
fun outsider_cannot_receive_seal_approval() {
    let mut scenario = setup_policy(CREATOR);
    let mut policy = scenario.take_shared<AccessPolicy>();

    register_form(&mut policy, b"form-private", vector[ADMIN], scenario.ctx());
    test_scenario::return_shared(policy);

    scenario.next_tx(OUTSIDER);
    let policy = scenario.take_shared<AccessPolicy>();
    seal_approve(b"form-private", &policy, scenario.ctx());

    test_scenario::return_shared(policy);
    scenario.end();
}
