import React from "react";
import { expect } from "chai";
import { render } from "@testing-library/react";
import Avatar from "./avatar";

describe("Avatar component", () => {
    it("renders with default src and alt when props are not provided", () => {
        const { getByAltText } = render(<Avatar />);
        const img = getByAltText("Avatar");
        expect(img).to.exist;
        expect(img.src).to.include("https://ui-avatars.com/api/?name=User");
        expect(img.alt).to.equal("Avatar");
        expect(img.style.width).to.equal("40px");
        expect(img.style.height).to.equal("40px");
        expect(img.style.borderRadius).to.equal("50%");
        expect(img.style.objectFit).to.equal("cover");
    });

    it("renders with provided src and alt", () => {
        const { getByAltText } = render(
            <Avatar src="https://example.com/avatar.png" alt="Profile" />
        );
        const img = getByAltText("Profile");
        expect(img).to.exist;
        expect(img.src).to.include("https://example.com/avatar.png");
        expect(img.alt).to.equal("Profile");
    });
});