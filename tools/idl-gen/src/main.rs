use std::{fs, path::PathBuf};

fn main() {
    let out = PathBuf::from("artifacts/idl");
    fs::create_dir_all(&out).expect("create artifacts/idl");

    sails_rs::generate_idl_to_file::<a2a_radar_core_program::RadarCoreProgram>(
        &out.join("a2a_radar_core_program.idl"),
    )
    .expect("generate core idl");
    sails_rs::generate_idl_to_file::<a2a_radar_broadcast_program::RadarBroadcastProgram>(
        &out.join("a2a_radar_broadcast_program.idl"),
    )
    .expect("generate broadcast idl");
    sails_rs::generate_idl_to_file::<a2a_radar_market_program::RadarMarketProgram>(
        &out.join("a2a_radar_market_program.idl"),
    )
    .expect("generate market idl");

    println!("Generated IDLs in {}", out.display());
}

