{
  description = "Modern React AI Chat App";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            bun
            nodejs_20
            nodePackages.typescript
            nodePackages.typescript-language-server
            tailwindcss-language-server
            vscode-langservers-extracted
          ];

          shellHook = ''
            echo "🚀 React AI Chat Development Environment"
            echo "Available tools:"
            echo "  - Bun $(bun --version)"
            echo "  - Node $(node --version)"
            echo "  - TypeScript $(tsc --version)"
            echo ""
            echo "Run 'bun install' to install dependencies"
            echo "Run 'bun dev' to start the development server"
          '';
        };
      });
}