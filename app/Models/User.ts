import Model, { DefaultSchema } from "./Model.ts";


type UserSchema = DefaultSchema & {
    email: string;
    password: string;
    name: string;
}

class User extends Model<{ _attributes: UserSchema }> {

    protected override _mutators = {
        email: (value: string) => value.trim().toLowerCase(),
    };

    protected override _fillable = [
        "email",
        "password",
        "name",
    ];

    protected override _guarded = [
        "id"
    ];
}

export default User;
