import { should } from "chai";  // Using Should style

should();  // Modifies `Object.prototype`

describe("Foo",
    function () {
        it("foo test",
            function () {
                "foo".should.equal("foo");
            }
        );
    }
);