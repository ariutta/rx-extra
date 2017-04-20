import { isArray } from 'lodash';
const Rx4 = require('rx');
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import * as inquirer from 'inquirer';

export interface InquirerPrompt {
	type: string;
	name: string;
	message: string|Function;
	default: string|number|any[]|Function;
	choices?: any[]|Function;
	validate?: Function;
	filter?: Function;
	when?: Function;
	pageSize?: number;
};
export interface InquirerAnswerConfirmValue {
	confirm: boolean;
}
export interface InquirerAnswerInputValue {
	input: string;
}
export type InquirerAnswerListValue = Record<'rawlist'|'list', string>;
export type InquirerAnswerValue = InquirerAnswerConfirmValue|InquirerAnswerInputValue|InquirerAnswerListValue;
export type InquirerAnswers = Map<string, InquirerAnswerValue>;

/**
 * ask
 *
 * @param {Observable} source
 * @param {function} getPromptSet - must return an array of one or more inquirer prompts
 * @param {function} [createIterable] - must return an array where each item is to be
 *                   presented with every prompt in the promptSet
 * @return {Observable} with each item being
 *                     {value: itemFromIterable, answers: answersFromPromptSet}
 */
export function askStatic<T>(
		source: Observable<T|T[]>,
		getPromptSet: (y: T) => InquirerPrompt[],
		/* TODO should we set a default value?
		getPromptSet: (y: T) => InquirerPrompt[] = function(y) {
			return [y];
		},
		//*/
		createIterable: (x: T|T[]) => T[] = function(x: T|T[]): T[] {
			return isArray(x) ? x : [x];
		}
): Observable<{value: T, answers: InquirerAnswers}> {
	const rx4Source = new Rx4.Subject();

	const itemSource = rx4Source
		.concatMap(function(sourceValue) {
			const items = createIterable(sourceValue);
			return Rx4.Observable.fromArray(items);
		});

	const fullPromptSource = itemSource
		.concatMap(function(item) {
			const promptSet = getPromptSet(item);
			return Rx4.Observable.fromArray(promptSet);
		});

	const inquirerSource = inquirer.prompt(fullPromptSource).ui.process;

	const rx4Output = itemSource
		.concatMap(function(item) {
			const starter = {
				value: item,
				answers: {}
			};

			const promptSet = getPromptSet(item);
			let finalPromptIndex = promptSet.length - 1;
			let promptIndex = 0;
			return Rx4.Observable.while(
					function() {
						// NOTE: the line below does the comparison before incrementing promptIndex.
						return promptIndex++ <= finalPromptIndex;
					},
					inquirerSource.take(1)
				)
				.reduce(function(accumulator, response) {
					const name = response.name;
					const answer = response.answer;
					const answers = accumulator.answers;
					answers[name] = answer;

					// If the next prompt is skipped due to inquirer's
					// "when" option, we need to take one fewer.
					//
					// NOTE: "promptIndex" here corresponds to the
					// promptIndex for the next time we are to enter
					// the "while" block above.
					const nextPrompt = promptSet[promptIndex];
					if (nextPrompt) {
						const nextWhen = nextPrompt.when;
						if (nextWhen && !nextWhen(answers)) {
							// decrement so as to take one fewer.
							finalPromptIndex -= 1;
						}
					}

					accumulator.answers = answers;
					return accumulator;
				}, starter);
		})
		.doOnError(function(err) {
			err.message = (err.message || '') + ' (observed in rx-extra ask)';
			throw err;
		});

	const rx5Output = new Subject();

	rx4Output
		.subscribe(
			function(x) {
				rx5Output.next(x);
			},
			function(err) {
				rx5Output.error(err);
			},
			function() {
				rx5Output.complete();
			}
		);

	source
		.subscribe(
			function(x) {
				rx4Source.onNext(x);
			},
			function(err) {
				rx4Source.onError(err);
			},
			function() {
				rx4Source.onCompleted();
			}
		);

	return rx5Output;
}

declare module 'rxjs/Observable' {
  namespace Observable {
    export let ask: typeof askStatic;
  }
}

Observable.ask = askStatic;

export default askStatic;
