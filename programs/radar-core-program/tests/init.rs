use gtest::{Program, System};

#[test]
fn core_constructor_initializes() {
    let sys = System::new();
    sys.init_logger();
    let user = 42;
    sys.mint_to(user, 1_000_000_000_000_000);
    let wasm_path = format!(
        "{}/../../target/wasm32v1-none/wasm32-gear/release/a2a_radar_core_program.opt.wasm",
        env!("CARGO_MANIFEST_DIR")
    );
    let program = Program::from_file(&sys, wasm_path);
    let init_payload = [0x0c, b'N', b'e', b'w'];
    let msg_id = program.send_bytes(user, init_payload);
    let result = sys.run_next_block();
    assert!(
        result.succeed.contains(&msg_id),
        "constructor failed: {result:#?}"
    );
}
