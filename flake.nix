{

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        default = pkgs.derivation {
          inherit system;
          builder = with pkgs; "${fish}/bin/fish";
        };
        devShells.default = pkgs.mkShellNoCC {
          buildInputs = with pkgs; [
            vscode-langservers-extracted
            nodejs_25
            pnpm_9
            podman
            podman-compose
            qemu
            k6
            postgresql
            redis
            treefmt
            nixpkgs-fmt
            nodePackages.prettier
          ];

          shellHook = ''
            alias docker=podman
            alias docker-compose=podman-compose
            export PATH="$PWD/node_modules/.bin:$PATH"
          '';
        };
      }
    );
}
