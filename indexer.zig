const std = @import("std");

const in = "./satser/";
const ut = "./res/db.js";

// data att läsa från zon fil
const SatsZon = struct {
    namn: []const u8,
    paa_listan: bool,
    nyckelord: []const []const u8,
};

// data att skriva till js fil
const SatsData = struct {
    kurs: []const u8,
    fil_namn: []const u8,
    sats: []const u8,
    paa_listan: bool,
    nyckelord: []const []const u8,
};

pub fn main(init: std.process.Init) !void {
    const gpa = init.gpa;
    const io = init.io;
    const cwd = std.Io.Dir.cwd();

    try cwd.createDirPath(io, std.fs.path.dirname(ut).?);
    const db_file = try cwd.createFile(io, ut, .{});
    defer db_file.close(io);

    var db_writer = db_file.writerStreaming(io, "");
    _ = try db_writer.interface.write("const db = [\n");

    var foersta_satsen = true;

    const huvud_katalog = try cwd.openDir(
        io,
        in,
        .{ .iterate = true },
    );
    defer huvud_katalog.close(io);

    // inehåller kurser
    var huvud_katalog_iter = huvud_katalog.iterate();
    while (try huvud_katalog_iter.next(io)) |kurs| {
        const sub_soekvag = try std.fs.path.join(
            gpa,
            &.{ in, kurs.name },
        );
        defer gpa.free(sub_soekvag);

        const kurs_katalog = try cwd.openDir(
            io,
            sub_soekvag,
            .{ .iterate = true },
        );
        defer kurs_katalog.close(io);

        // inehåller satser
        var kurs_katalog_iter = kurs_katalog.iterate();
        while (try kurs_katalog_iter.next(io)) |sats| {
            std.debug.print(
                "[*] {s}/{s}\n",
                .{ kurs.name, sats.name },
            );

            const sats_soekvag = try std.fs.path.join(
                gpa,
                &.{ sub_soekvag, sats.name },
            );
            defer gpa.free(sats_soekvag);

            // inehåller sats-data
            const sats_katalog = try cwd.openDir(
                io,
                sats_soekvag,
                .{},
            );
            defer sats_katalog.close(io);

            // läs och allokera med sentinel
            const zon_raa = blk: {
                break :blk sats_katalog.readFileAllocOptions(
                    io,
                    "sats.zon",
                    gpa,
                    .unlimited,
                    std.mem.Alignment.of(u8),
                    0,
                ) catch |err| {
                    switch (err) {
                        error.FileNotFound => std.debug.print(
                            "[ERR] \"{s}/{s}\" saknar en sats.zon!\n",
                            .{ kurs.name, sats.name },
                        ),
                        else => {},
                    }
                    continue;
                };
            };
            defer gpa.free(zon_raa);

            const sats_zon = try std.zon.parse.fromSliceAlloc(
                SatsZon,
                gpa,
                zon_raa,
                null,
                .{},
            );
            defer std.zon.parse.free(gpa, sats_zon);

            const sats_data = SatsData{
                .kurs = kurs.name,
                .fil_namn = sats.name,
                .sats = sats_zon.namn,
                .paa_listan = sats_zon.paa_listan,
                .nyckelord = sats_zon.nyckelord,
            };

            if (!foersta_satsen) {
                _ = try db_writer.interface.write(",\n");
            }
            foersta_satsen = false;

            _ = try db_writer.interface.write("\t");
            try std.json.Stringify.value(
                sats_data,
                .{},
                &db_writer.interface,
            );
            std.debug.print(
                "[+] Exporterade {s}/{s}\n",
                .{ kurs.name, sats.name },
            );
        }
    }

    _ = try db_writer.interface.write("\n];\n");
    try db_writer.flush();
}
