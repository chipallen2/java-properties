declare class PropertiesFile {
    objs: {
        [key: string]: any;
    };
    lookupDuplicateKeys: boolean;
    lookupDuplicateValues: boolean;
    duplicateKeys: {
        [file: string]: ({
            [key: string]: number[];
        });
    };
    duplicateValues: {
        [file: string]: ({
            [value: string]: number[];
        });
    };
    constructor(...args: string[]);
    enableLookupDuplicateKeys(): this;
    enableLookupDuplicateValues(): this;
    parseValue(value: string): string;
    makeKeys(line: string): string[] | null;
    addFile(file: string): void;
    of(...args: string[]): this;
    get(key: string, defaultValue?: string): string | string[] | undefined;
    getLast(key: string, defaultValue?: string): string | undefined;
    getFirst(key: string, defaultValue?: string): string | undefined;
    getInt(key: string, defaultIntValue?: number): number | undefined;
    getFloat(key: string, defaultFloatValue?: number): number | undefined;
    getBoolean(key: string, defaultBooleanValue?: boolean): boolean;
    set(key: string, value: string): void;
    interpolate(s: string): string;
    getKeys(): string[];
    getMatchingKeys(matchstr: string): string[];
    getKeysForValue(value: string): string[];
    flattenFirst(): this;
    reset(): void;
    hasDuplicateKeys(): boolean;
    hasDuplicateValues(): boolean;
}
declare let of: (...args: any[]) => PropertiesFile;
export { PropertiesFile, of };
