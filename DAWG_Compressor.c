// This program demonstrates the sleek construction of a lexicon data structure known as the "Directed Acyclic Word Graph".
// Weighing in at nearly 800 lines, this algorithm was not forged through trivial and comprehensive documentation.

// To set up this traditional DAWG for creation, set up the following 3 conditions.
// 1) "Lexicon.txt" is a word list, where all characters are capital, and the number of words is written on the very first line. Linux format, so no DOS CR character.
// 2) Set the constant MAX below to the length of the longest word in the lexicon.  One letter words are invalid in this program.
// 3) Understand the procedures for extracting information from the unsigned integer nodes.

// Keep in mind that traversing a traditional DAWG is only optimal when it takes place in alphabetical order.
// The unsigned integer encoding that we are using for this "Dawg" allows for up to 33554432 nodes.  That is very many more nodes than an current English lexicon will require.

#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#define MAX 15
#define MIN 2
#define NUMBER_OF_REDUCED_LETTERS 14
#define INPUT_LIMIT 30
#define BIG_IT_UP -32
#define LETTER_BIT_SHIFT 25
#define LETTER_BIT_MASK 1040187392
#define	CHILD_INDEX_BIT_MASK 33554431
#define END_OF_WORD_BIT_MASK 2147483648
#define END_OF_LIST_BIT_MASK 1073741824
#define BINARY_STRING_LENGTH 38

// we will store the DAWG into a ".txt" file to verify the output, and a ".dat" file for use.
#define RAW_LEXICON "Lexicon.txt"
#define DAWG_DATA "Dawg_For_Lexicon.dat"
#define DAWG_TEXT_DATA "Dawg_Text_For_Lexicon.txt"

// When reading strings from a file, the new-line character is appended, and this macro will remove it before processing.
#define CUT_OFF_NEW_LINE(string) (string[strlen(string) - 1] = '\0')

// C requires a boolean variable type so use C's typedef concept to create one.
typedef enum { FALSE = 0, TRUE = 1 } Bool;
typedef Bool* BoolPtr;

// This array streamlines the conversion of digit strings into integers.  Unsigned integers do not exceed the low billions, so ten numbers will suffice.
unsigned int PowersOfTen[10] = {1, 10, 100, 1000, 10000, 100000, 1000000, 10000000, 100000000, 1000000000};
unsigned int PowersOfTwo[32] = {1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072, 262144, 524288, 1048576, 2097152, 4194304, 8388608, 16777216, 33554432, 67108864, 134217728, 268435456, 536870912, 1073741824, 2147483648};

// Returns the unsigned integer rerpresented by "TheNumberNotYet" string, and if not a number greater then zero, returns 0.
unsigned int StringToUnsignedInt(char *TheNumberNotYet){
	unsigned int Result = 0;
	unsigned int X;
	unsigned int Digits = strlen(TheNumberNotYet);
	for ( X = 0; X < Digits; X++ ) {
		if ( !(TheNumberNotYet[X] >= '0' && TheNumberNotYet[X] <= '9') ) {
			printf("TheNumberNotYet[X] not a numeral ?? |%c|\n", TheNumberNotYet[X]);
			return 0;
		}
		unsigned int power = PowersOfTen[Digits - X - 1];
		printf("power |%d|\n", power);
		Result += (TheNumberNotYet[X] - '0')*power;
	}
	return Result;
}

// This Function converts any lower case letters in the string "RawWord", into capitals, so that the whole string is made of capital letters.
void MakeMeAllCapital(char *RawWord){
	unsigned int X;
	for ( X = 0; X < strlen(RawWord); X++ ){
		if (RawWord[X] >= 'a' && RawWord[X] <= 'z' ) RawWord[X] = RawWord[X] + BIG_IT_UP;
	}
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// "Tnode" functionality.  These will be the nodes contained in a "Trie" designed to convert into a "Dawg".

struct tnode {
	struct tnode* Next;
	struct tnode* Child;
	struct tnode* ParentalUnit;
	// When populating the array, you must know the indices of child nodes.  Hence we Store "ArrayIndex" in every node so that we can mine the information from the reduced "Trie".
	int ArrayIndex;
	char DirectChild;
	char Letter;
	char MaxChildDepth;
	char Level;
	char NumberOfChildren;
	char Dangling;
	char EndOfWordFlag;
};

typedef struct tnode Tnode;
typedef Tnode* TnodePtr;

// Extracting "Tnode" member data will consume a lot of time when finding redundant nodes, so define these functions as macros.
// The only negative effect is that the programmer must be diligent to use these constructs on the right data.  Otherwise, this decision makes the program faster.
#define TNODE_ARRAY_INDEX(thistnode) (thistnode->ArrayIndex)
#define TNODE_DIRECT_CHILD(thistnode) (thistnode->DirectChild)
#define TNODE_NEXT(thistnode) (thistnode->Next)
#define TNODE_CHILD(thistnode) (thistnode->Child)
#define TNODE_PARENTAL_UNIT(thistnode) (thistnode->ParentalUnit)
#define TNODE_LETTER(thistnode) (thistnode->Letter)
#define TNODE_MAX_CHILD_DEPTH(thistnode) (thistnode->MaxChildDepth)
#define TNODE_NUMBER_OF_CHILDREN(thistnode) (thistnode->NumberOfChildren)
#define TNODE_END_OF_WORD_FLAG(thistnode) (thistnode->EndOfWordFlag)
#define TNODE_LEVEL(thistnode) (thistnode->Level)
#define TNODE_DANGLING(thistnode) (thistnode->Dangling)

TnodePtr TnodeInit(char Chap, TnodePtr OverOne, char WordEnding, char Leveler, int StarterDepth, TnodePtr Parent, char IsaChild){
	TnodePtr Result = (Tnode*)malloc(sizeof(Tnode));
	Result->Letter = Chap;
	Result->ArrayIndex = 0;
	Result->NumberOfChildren = 0;
	Result->MaxChildDepth = StarterDepth;
	Result->Next = OverOne;
	Result->Child = NULL;
	Result->ParentalUnit = Parent;
	Result->Dangling = FALSE;
	Result->EndOfWordFlag = WordEnding;
	Result->Level = Leveler;
	Result->DirectChild = IsaChild;
	return Result;
}

// Define all of the member-setting functions as macros for faster performance in "Trie" creation.
#define TNODE_SET_ARRAY_INDEX(thistnode, thewhat) (thistnode->ArrayIndex = thewhat)
#define TNODE_SET_CHILD(thistnode, nexis) (thistnode->Child = nexis)
#define TNODE_SET_NEXT(thistnode, nexi) (thistnode->Next = nexi)
#define TNODE_SET_PARENTAL_UNIT(thistnode, beforeme) (thistnode->ParentalUnit = beforeme)
#define TNODE_ADD_ONE_CHILD(thistnode) (thistnode->NumberOfChildren += 1)
#define TNODE_SET_MAX_CHILD_DEPTH(thistnode, newdepth) (thistnode->MaxChildDepth = newdepth)
#define TNODE_SET_DIRECT_CHILD(thistnode, status) (thistnode->DirectChild = status)
#define TNODE_FLY_END_OF_WORD_FLAG(thistnode) (thistnode->EndOfWordFlag = TRUE)
#define TNODE_DANGLE_ME(thistnode) (thistnode->Dangling = TRUE)

// This function Dangles a node, but also recursively dangles every node under it as well, that way nodes that are not direct children do hit the chopping block.
// The function returns the total number of nodes dangled as a result.
int TnodeDangle(TnodePtr ThisTnode){
	int Result = 0;
	if ( TNODE_DANGLING(ThisTnode) == TRUE ) return 0;
	if ( TNODE_NEXT(ThisTnode) != NULL ) Result += TnodeDangle(TNODE_NEXT(ThisTnode));
	if ( TNODE_CHILD(ThisTnode) != NULL ) Result += TnodeDangle(TNODE_CHILD(ThisTnode));
	TNODE_DANGLE_ME(ThisTnode);
	Result += 1;
	return Result;
}

// This function returns the pointer to the Tnode in a parallel list of nodes with the letter "ThisLetter", and returns NULL if the Tnode does not exist.
// In the "NULL" case, an insertion will be required.
TnodePtr TnodeFindParaNode(TnodePtr ThisTnode, char ThisLetter){
	if ( ThisTnode == NULL ) return NULL;
	TnodePtr Result = ThisTnode;
	if ( TNODE_LETTER(Result) == ThisLetter ) return Result;
	while ( TNODE_LETTER(Result) < ThisLetter ) {
		Result = TNODE_NEXT(Result);
		if ( Result == NULL ) return NULL;
	}
	if ( TNODE_LETTER(Result) == ThisLetter ) return Result;
	else return NULL;
}

// This function inserts a new Tnode before a larger letter node or at the end of a Para-List If the list does not exist then it is put at the beginnung.  
// The new node has "ThisLetter" in it.  "AboveTnode" is the node 1 level above where the new node will be placed.
// This function should never be passed a "NULL" pointer.  "ThisLetter" should never exist in the "Child" Para-List.
void TnodeInsertParaNode(TnodePtr AboveTnode, char ThisLetter, char WordEnder, int StartDepth){
	TNODE_ADD_ONE_CHILD(AboveTnode);
	TnodePtr Holder = NULL;
	TnodePtr Currently = NULL;
	// Case 1:  Para-List does not exist yet, so start it.
	if ( TNODE_CHILD(AboveTnode) == NULL ) TNODE_SET_CHILD(AboveTnode, TnodeInit(ThisLetter, NULL, WordEnder, TNODE_LEVEL(AboveTnode) + 1, StartDepth, AboveTnode, TRUE));
	// Case 2: ThisLetter should be the first in the Para-List that already exists.
	else if ( TNODE_LETTER(TNODE_CHILD(AboveTnode)) > ThisLetter ) {
		Holder = TNODE_CHILD(AboveTnode);
		// The "Holder" node will no longer be a direct child, so set it as such.
		TNODE_SET_DIRECT_CHILD(Holder, FALSE);
		TNODE_SET_CHILD(AboveTnode, TnodeInit(ThisLetter, Holder, WordEnder, TNODE_LEVEL(AboveTnode) + 1, StartDepth, AboveTnode, TRUE ));
		// "Holder"'s "ParentalUnit" is now the new node, so make the necessary change.
		TNODE_SET_PARENTAL_UNIT(Holder, TNODE_CHILD(AboveTnode));
	}
	// Case 3: The ParaList exists and ThisLetter is not first in the list.  This is the default case condition:  "if ( TNODE_LETTER(TNODE_CHILD(AboveTnode)) < ThisLetter )".
	else {
		Currently = TNODE_CHILD(AboveTnode);
		while ( TNODE_NEXT(Currently) != NULL ) {
			if ( TNODE_LETTER(TNODE_NEXT(Currently)) > ThisLetter ) break;
			Currently = TNODE_NEXT(Currently);
		}
		Holder = TNODE_NEXT(Currently);
		TNODE_SET_NEXT(Currently, TnodeInit(ThisLetter, Holder, WordEnder, TNODE_LEVEL(AboveTnode) + 1, StartDepth, Currently, FALSE));
		if ( Holder != NULL ) TNODE_SET_PARENTAL_UNIT(Holder, TNODE_NEXT(Currently));
	}
}

// This function returns "TRUE" if "FirstNode" and "SecondNode" are found to be the parent nodes of equal tree branches.  This includes identical nodes in the current list.
// The "MaxChildDepth" of the two nodes can not be assumed equal due to the recursive nature of this function, so we must check for equivalence.
Bool TnodeAreWeTheSame(TnodePtr FirstNode, TnodePtr SecondNode){
	if ( FirstNode == SecondNode ) return TRUE;
	if ( FirstNode == NULL || SecondNode == NULL ) return FALSE;
	if ( TNODE_LETTER(FirstNode) != TNODE_LETTER(SecondNode) ) return FALSE;
	if ( TNODE_MAX_CHILD_DEPTH(FirstNode) != TNODE_MAX_CHILD_DEPTH(SecondNode) ) return FALSE;
	if ( TNODE_NUMBER_OF_CHILDREN(FirstNode) != TNODE_NUMBER_OF_CHILDREN(SecondNode) ) return FALSE;
	if ( TNODE_END_OF_WORD_FLAG(FirstNode) != TNODE_END_OF_WORD_FLAG(SecondNode) ) return FALSE;
	if ( TnodeAreWeTheSame(TNODE_CHILD(FirstNode), TNODE_CHILD(SecondNode)) == FALSE ) return FALSE;
	if ( TnodeAreWeTheSame(TNODE_NEXT(FirstNode), TNODE_NEXT(SecondNode)) == FALSE ) return FALSE;
	else return TRUE;
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// "Trie" functionality.

struct trie {
	int NumberOfTotalWords;
	int NumberOfTotalNodes;
	TnodePtr First;
};

typedef struct trie Trie;
typedef Trie* TriePtr;

// Set up the "First" node in the Trie.
TriePtr TrieInit (void){
	TriePtr Result;
	Result = (TriePtr)malloc(sizeof(Trie));
	Result->NumberOfTotalWords = 0;
	Result->NumberOfTotalNodes = 0;
	// The "First" node in the "Trie" will be a dummy node.
	Result->First = TnodeInit('0', NULL, FALSE, 0, 0, NULL, FALSE);
	return Result;
}

TnodePtr TrieRootTnode(TriePtr ThisTrie){
	if ( ThisTrie->NumberOfTotalWords > 0 ) return TNODE_CHILD(ThisTrie->First);
	else return NULL;
} 

// This function simply makes "TrieAddWord" look a lot smaller.  It returns the number of new nodes that it just inserted.
int TnodeAddWord(TnodePtr ParentNode, const char *Word){
	int Result = 0;
	int X, Y;
	int WordLength = strlen(Word);
	TnodePtr HangPoint = NULL;
	TnodePtr Current = ParentNode;
	// Try to follow the path of "Word" until it doesn't exist, and then hang a new chain of nodes to include it in the trie.
	for ( X = 0; X < WordLength; X++ ) {
		HangPoint = TnodeFindParaNode(TNODE_CHILD(Current), Word[X]);
		if ( HangPoint == NULL ) {
			TnodeInsertParaNode(Current, Word[X], ((X == (WordLength - 1))? TRUE: FALSE), WordLength - X - 1);
			Result += 1;
			Current = TnodeFindParaNode(TNODE_CHILD(Current), Word[X]);
			for ( Y = X + 1; Y < WordLength; Y++ ) {
				TnodeInsertParaNode(Current, Word[Y], ((Y == (WordLength - 1))? TRUE: FALSE), WordLength - Y - 1);
				Result += 1;
				Current = TNODE_CHILD(Current);
			}
			break;
		}
		else if ( TNODE_MAX_CHILD_DEPTH(HangPoint) < (WordLength - X - 1) ) TNODE_SET_MAX_CHILD_DEPTH(HangPoint, (WordLength - X - 1));
		Current = HangPoint;
		// The path for the word that we are trying to insert already exists, so just make sure that the end flag is flying on the last node.  This should never happen if words are added in alphabetical order, but this is not a requirement of the program.
		if ( X == WordLength - 1 ) TNODE_FLY_END_OF_WORD_FLAG(Current);
	}
	return Result;
}

// This function adds to "ThisTrie"'s counter variables and adds "NewWord", using "TnodeAddWord", where the real addition algorithm exists.
void TrieAddWord(TriePtr ThisTrie, char *NewWord){
	ThisTrie->NumberOfTotalWords += 1;
	ThisTrie->NumberOfTotalNodes += TnodeAddWord( ThisTrie->First, NewWord );
}

// This is a standard depth-first preorder tree traversal, whereby the objective is to count nodes of various "MaxChildDepth"s.
// The counting results are placed into the "Tabulator" array.  This will be used to streamline the "Trie"-to-"Dawg" conversion process.
void TnodeGraphTabulateRecurse(TnodePtr ThisTnode, int Level, int* Tabulator){
	if ( Level == 0 ) TnodeGraphTabulateRecurse(TNODE_CHILD(ThisTnode), Level + 1, Tabulator);
	else if ( TNODE_DANGLING(ThisTnode) == FALSE ) {
		Tabulator[TNODE_MAX_CHILD_DEPTH(ThisTnode)] += 1;
		// Go Down if possible.
		if ( TNODE_CHILD(ThisTnode) != NULL ) TnodeGraphTabulateRecurse(TNODE_CHILD(ThisTnode), Level + 1, Tabulator );
		// Go Right through the Para-List if possible.
		if ( TNODE_NEXT(ThisTnode) != NULL ) TnodeGraphTabulateRecurse(TNODE_NEXT(ThisTnode), Level, Tabulator );
	}
}

// Count the "Tnode"'s in "ThisTrie" for each "MaxChildDepth".  "Count" needs to be an integer array of size "MAX".
void TrieGraphTabulate(TriePtr ThisTrie, int* Count){
	int *Numbers = (int*)malloc(MAX*sizeof(int));
	int X;
	for ( X = 0; X < MAX; X++ ) Numbers[X] = 0;
	if ( ThisTrie->NumberOfTotalWords > 0) {
		TnodeGraphTabulateRecurse(ThisTrie->First, 0, Numbers);
		for ( X = 0; X < MAX; X++ ) {
			Count[X] = Numbers[X];
		}
	}
	free(Numbers);
}

// This function can never be called after a trie has been mowed because this will free pointers twice resulting in a core dump!
void FreeTnodeRecurse(TnodePtr ThisTnode){
	if ( TNODE_CHILD(ThisTnode) != NULL ) FreeTnodeRecurse(TNODE_CHILD(ThisTnode)) ;
	if ( TNODE_NEXT(ThisTnode) != NULL ) FreeTnodeRecurse(TNODE_NEXT(ThisTnode));
	free(ThisTnode);
}

// An important function, it returns the first node in the list "MaxChildDepthWist", that is identical to "ThisTnode".
// If the function returns a value equal to "ThisTnode", then it is the first of its kind in the "Trie"
TnodePtr TnodeMexicanEquivalent( TnodePtr ThisTnode, TnodePtr ** MaxChildDepthWist ) {
	int Tall = TNODE_MAX_CHILD_DEPTH(ThisTnode);
	int X = 0;
	while ( TnodeAreWeTheSame(ThisTnode, MaxChildDepthWist[Tall][X]) == FALSE ) {
		X += 1;
	}
	return MaxChildDepthWist[Tall][X];
}

// Recursively replaces all redundant nodes in a trie with their first equivalent.
void TnodeLawnMowerRecurse(TnodePtr ThisTnode, TnodePtr ** HeightWits){
	printf("\nTnodeLawnMowerRecurse\n");
	
	if ( TNODE_LEVEL(ThisTnode) == 0 ) TnodeLawnMowerRecurse(TNODE_CHILD(ThisTnode), HeightWits);
	else {
		// When replacing a "Tnode", we must do so knowing that "ThisTnode" is how we got to it.
		if ( TNODE_NEXT(ThisTnode) == NULL && TNODE_CHILD(ThisTnode) == NULL ) return;
		if ( TNODE_CHILD(ThisTnode) != NULL ) {
			// we have found a node that has been tagged for mowing, so let us destroy it, not literally, and replace it with its first equivelant in the "HeightWits" list, which won't be tagged.
			if ( TNODE_DANGLING(TNODE_CHILD(ThisTnode)) == TRUE ) {
				TNODE_SET_CHILD(ThisTnode, TnodeMexicanEquivalent(TNODE_CHILD(ThisTnode), HeightWits));
			}
			else TnodeLawnMowerRecurse( ThisTnode->Child, HeightWits );
		}
		// Traverse the rest of the "Trie", but a "Tnode" that is not a direct child will never be directly replaced.
		// This will allow the resulting "Dawg" to fit into a contiguous array of node lists.
		if ( TNODE_NEXT(ThisTnode) != NULL ) TnodeLawnMowerRecurse(TNODE_NEXT(ThisTnode), HeightWits);
	}
}

// Replaces each redundant list in "ThisTrie" with its first equivalent.
void TrieLawnMower(TriePtr ThisTrie, TnodePtr ** HeightWise){
	TnodeLawnMowerRecurse(ThisTrie->First, HeightWise );
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// A queue is required for breadth first traversal, and the rest is self evident.

struct breadthqueuenode {
	TnodePtr Element;
	struct breadthqueuenode *Next;
};

typedef struct breadthqueuenode BreadthQueueNode;
typedef BreadthQueueNode* BreadthQueueNodePtr;

// In the spirit of keeping the code fast, use macros for basic functionality.
#define BREADTH_QUEUE_NODE_NEXT(thisbreadthqueuenode) (thisbreadthqueuenode->Next)
#define BREADTH_QUEUE_NODE_ELEMENT(thisbreadthqueuenode) (thisbreadthqueuenode->Element);
#define BREADTH_QUEUE_NODE_SET_NEXT(thisbreadthqueuenode, nexit) (thisbreadthqueuenode->Next = nexit)
#define BREADTH_QUEUE_NODE_SET_ELEMENT(thisbreadthqueuenode, element) (thisbreadthqueuenode->Element = element)

BreadthQueueNodePtr BreadthQueueNodeInit(TnodePtr NewElement){
	BreadthQueueNodePtr Result = (BreadthQueueNode*)malloc(sizeof(BreadthQueueNode));
	Result->Element = NewElement;
	Result->Next = NULL;
	return Result;
}

struct breadthqueue {
	BreadthQueueNodePtr Front;
	BreadthQueueNodePtr Back;
	int Size;
};

typedef struct breadthqueue BreadthQueue;
typedef BreadthQueue* BreadthQueuePtr;

BreadthQueuePtr BreadthQueueInit( void ) {
	BreadthQueuePtr Result = (BreadthQueue*)malloc(sizeof(BreadthQueue));
	Result->Front = NULL;
	Result->Back = NULL;
	Result->Size = 0;
}

void BreadthQueuePush(BreadthQueuePtr ThisBreadthQueue, TnodePtr NewElemental){
	BreadthQueueNodePtr Noob = BreadthQueueNodeInit(NewElemental);
	if ( (ThisBreadthQueue->Back) != NULL ) BREADTH_QUEUE_NODE_SET_NEXT(ThisBreadthQueue->Back, Noob);
	else ThisBreadthQueue->Front = Noob;
	ThisBreadthQueue->Back = Noob;
	ThisBreadthQueue->Size += 1;
}

TnodePtr BreadthQueuePop(BreadthQueuePtr ThisBreadthQueue){
	TnodePtr Result;
	if ( ThisBreadthQueue->Size == 0 ) return NULL;
	if ( ThisBreadthQueue->Size == 1 ) {
		ThisBreadthQueue->Back = NULL;
		ThisBreadthQueue->Size = 0;
		Result = BREADTH_QUEUE_NODE_ELEMENT(ThisBreadthQueue->Front);
		free(ThisBreadthQueue->Front);
		ThisBreadthQueue->Front = NULL;
		return Result;
	}
	Result = BREADTH_QUEUE_NODE_ELEMENT(ThisBreadthQueue->Front);
	BreadthQueueNodePtr Holder = ThisBreadthQueue->Front;
	ThisBreadthQueue->Front = BREADTH_QUEUE_NODE_NEXT(ThisBreadthQueue->Front);
	free(Holder);
	ThisBreadthQueue->Size -= 1;
	return Result;
}

void BreadthQueuePopulateReductionArray(BreadthQueuePtr ThisBreadthQueue, TnodePtr Root, TnodePtr **Holder){
	printf( "Inside external BreadthQueuePopulateReductionArray function.\n" );
	int Taker[MAX];
	int X = 0;
	int PopCount = 0;
	int CurrentMaxChildDepth = 0;
	TnodePtr Current = Root;
	for ( X = 0; X < MAX; X++ ) Taker[X] = 0;
	// Push the first row onto the queue.
	while ( Current != NULL ) {
		BreadthQueuePush(ThisBreadthQueue, Current);
		Current = TNODE_NEXT(Current);
	}
	// Initiate the pop-followed-by-push-all-children loop.
	while ( (ThisBreadthQueue->Size) != 0 ) {
		Current = BreadthQueuePop(ThisBreadthQueue);
		PopCount += 1;
		CurrentMaxChildDepth = TNODE_MAX_CHILD_DEPTH(Current);
		Holder[CurrentMaxChildDepth][Taker[CurrentMaxChildDepth]] = Current;
		Taker[CurrentMaxChildDepth] += 1;
		Current = TNODE_CHILD(Current);
		while ( Current != NULL ) {
			BreadthQueuePush(ThisBreadthQueue, Current);
			Current = TNODE_NEXT(Current);
		}
	}
	printf( "Completed Populating The Reduction Array.\n" );
}

// This function will label all of the remaining nodes in the Trie-Turned-Dawg so that they will fit contiguously into an unsigned integer array.
// The return value is the final index number handed out to the "Tnode"'s, and hence one less than the size of the array that they need to fit into.
int BreadthQueueUseToIndex(BreadthQueuePtr ThisBreadthQueue, TnodePtr Root){
	// The first index to be given out will be "1" because "0" denotes "NULL". 
	int IndexNow = 0;
	TnodePtr Current = Root;
	// Push the first Para-List onto the queue.
	while ( Current != NULL ) {
		BreadthQueuePush(ThisBreadthQueue, Current);
		Current = TNODE_NEXT(Current);
	}
	// Pop each element off of the queue and only push its children if has not been dangled yet.
	// Assign an index to the node, if one has not been given to it yet. Nodes will be placed on the queue many times.
	while ( (ThisBreadthQueue->Size) != 0 ) {
		Current = BreadthQueuePop(ThisBreadthQueue);
		// If the "Current" node already has an index, don't give it a new one.
		if ( TNODE_ARRAY_INDEX(Current) == 0 ) {
			IndexNow += 1;
			TNODE_SET_ARRAY_INDEX(Current, IndexNow);
			Current = TNODE_CHILD(Current);
			while ( Current != NULL ) {
				BreadthQueuePush(ThisBreadthQueue, Current);
				Current = TNODE_NEXT(Current);
			}
		}
	}
	printf( "Completed Assigning Indices To Living Nodes.\n" );
	return IndexNow;
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// This section contains code related to the format of unsigned integers that represent "Dawg" nodes.

// The "BinaryNode" string must be at least 32 + 5 + 1 bytes in length.  Space for the bits, the seperation pipes, and the end of string char.
void ConvertUnsignedIntNodeToBinaryString(unsigned int TheNode, char* BinaryNode){
	int X;
	int Bit;
	BinaryNode[0] = '|';
	// Bit 31, the leftmost bit, represents the "EndOfWordFlag".
	BinaryNode[1] = (TheNode & PowersOfTwo[31])?'1':'0';
	BinaryNode[2] = '|';
	// Bit 30 represents the "EndOfListFlag".
	BinaryNode[3] = (TheNode & PowersOfTwo[30])?'1':'0';
	BinaryNode[4] = '|';
	// Bit 29 to bit 25 are the "Letter" bits.
	BinaryNode[5] = (TheNode & PowersOfTwo[29])?'1':'0';
	BinaryNode[6] = (TheNode & PowersOfTwo[28])?'1':'0';
	BinaryNode[7] = (TheNode & PowersOfTwo[27])?'1':'0';
	BinaryNode[8] = (TheNode & PowersOfTwo[26])?'1':'0';
	BinaryNode[9] = (TheNode & PowersOfTwo[25])?'1':'0';
	BinaryNode[10] = '|';
	// Bit 24 to bit 0, are space of the first child index.
	Bit = 24;
	for ( X = 11; X <= 35; X++ ) {
		BinaryNode[X] = (TheNode & PowersOfTwo[Bit])? '1': '0';
		Bit -= 1;
	}
	BinaryNode[36] = '|';
	BinaryNode[37] = '\0';
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// This function is the core of the "Dawg" creation procedure.  Pay close attention to the order of the steps involved.

unsigned int *DawgInit(char **Dictionary, int *SegmentLenghts, int MaxStringLength, int MinStringLength){
	unsigned int *Result;
	int X = 0;
	int Y;
	int *ChildCount;
	char *ChildStrings;
	TriePtr TemporaryTrie;
	int *NodeNumberCounter;
	int *NodeNumberCounterInit;
	int TotalNodeSum = 0;
	TnodePtr ** HolderOfAllTnodePointers;
	BreadthQueuePtr Populator;
	int NumberDangled;
	int TotalDangled = 0;
	int W;
	int DangleCount[MaxStringLength];
	int NumberOfLivingNodes;
	int TotalDangledCheck = 0;
	BreadthQueuePtr OrderMatters;
	int IndexCount;
	int IndexFollow;
	int IndexFollower = 0;
	unsigned int UnsignedEncodingValue;
	FILE *Text;
	FILE *Data;
	char TheNodeInBinary[BINARY_STRING_LENGTH];
	
	printf("\nStep 0 - Get ready to watch the Dawg creation procedure.\n");
	
	while ( SegmentLenghts[X] == 0 ) X += 1;

	printf("\nStep 1 - Create the intermediate Trie and begin filling it with the provided lexicon.\n");
	// Create a Temp Trie structure and then feed in the given lexicon.
	TemporaryTrie = TrieInit();
	for ( X = MinStringLength; X <= MaxStringLength; X++ ) {
		for ( Y = 0; Y < SegmentLenghts[X]; Y++ ) {
			TrieAddWord(TemporaryTrie, &(Dictionary[X][(X + 1)*Y]));
		}
	}

	printf("\nStep 2 - Finished adding words to the temporary Trie, so set up the space to sort the Tnodes by MaxChildDepth.\n");
	printf("\nStep 2 - Finished adding words to the temporary Trie, so set up the space to sort the Tnodes by MaxChildDepth.\n");
	// Create the associated pointer array with all the nodes inside it.
	NodeNumberCounter = (int*)malloc(MaxStringLength*sizeof(int) );
	for ( X = 0; X < MaxStringLength; X++ ) NodeNumberCounter[X] = 0;
	NodeNumberCounterInit = (int*)malloc(MaxStringLength*sizeof(int));

	printf("\nStep 3 - Count the total number of nodes in the raw Trie by MaxChildDepth.\n");
	TrieGraphTabulate(TemporaryTrie, NodeNumberCounter);
	
	printf("\nStep 4 - Initial counting of Trie nodes complete, so display the results.\n\n");
	
	for ( X = 0; X < MaxStringLength; X++ ) {
		NodeNumberCounterInit[X] = NodeNumberCounter[X];
		TotalNodeSum += NodeNumberCounter[X];
	}
	for ( X = 0; X < MaxStringLength; X++ ) {
		printf("Initial Count For MaxChildDepth |%2d| is |%6d| nodes\n", X, NodeNumberCounterInit[X]);
	}
	printf("\nThe Total Number Of Nodes In The Trie = |%d| \n", TotalNodeSum);
	// We will have exactly enough space for all of the Tnode pointers.

	printf("\nStep 5 - Allocate a 2 dimensional array of Tnode pointers to minimize the trie into a Dawg.\n");
	HolderOfAllTnodePointers = (TnodePtr **)malloc(MaxStringLength*sizeof(TnodePtr*));
	for ( X = 0; X < MAX; X++ ) HolderOfAllTnodePointers[X] = (TnodePtr *)malloc(NodeNumberCounterInit[X]*sizeof(TnodePtr));
	
	// When populating the "HolderOfAllTnodePointers", we are going to do so in a breadth first manner to ensure that the next "Tnode" in a list located at the next array index. 
	printf("\nStep 6 - Populate the 2 dimensional array of Trie node pointers.\n");
	Populator = BreadthQueueInit();
	BreadthQueuePopulateReductionArray(Populator, TrieRootTnode(TemporaryTrie), HolderOfAllTnodePointers );

	printf("\nStep 7 - Population complete.\n");
	// Flag all of the reduntant nodes.
	// Flagging requires the node comparison function that will take a very long time for a big dictionary.
	// This is especially true when comparing the nodes with small "MaxChildDepth"'s because there are so many of them. 
	// It is faster to start with nodes of the largest "MaxChildDepth" to recursively reduce as many lower nodes as possible. 

	printf("\nStep 8 - Begin to tag redundant nodes as dangled - Use recursion because only direct children are considered for elimination to keep the remaining lists in tact.\n");
	// Start at the largest "MaxChildDepth" and work down from there for recursive reduction to take place early on to reduce the work load for the shallow nodes.
	for ( Y = (MaxStringLength - 1); Y >= 0 ; Y--) {
		NumberDangled = 0;
		// Move through the holder array from the beginning, looking for any nodes that have not been dangled, these will be the surviving nodes.
		for ( W = 0; W < (NodeNumberCounterInit[Y] - 1); W++ ) {
			// The Node is already Dangling.  Note that this node need not be the first in a child list, it could have been dangled recursively.
			// In order to eliminate the need for the "Next" index, the nodes at the root of elimination must be the first in a list, in other words, a "DirectChild".
			// The node that we replace the "DirectChild" node with can be located at any position.
			if ( TNODE_DANGLING(HolderOfAllTnodePointers[Y][W]) == TRUE ) continue;
			// Traverse the rest of the array looking for equivalent nodes that are both not dangled and are tagged as direct children.
			// When we have found an identical list structure further on in the array, dangle it, and all the nodes coming after, and below it.
			for ( X = W + 1; X < NodeNumberCounterInit[Y]; X++ ) {
				if ( TNODE_DANGLING(HolderOfAllTnodePointers[Y][X]) == FALSE && TNODE_DIRECT_CHILD(HolderOfAllTnodePointers[Y][X]) == TRUE ) {
					if ( TnodeAreWeTheSame(HolderOfAllTnodePointers[Y][W], HolderOfAllTnodePointers[Y][X]) == TRUE ) {
						NumberDangled += TnodeDangle(HolderOfAllTnodePointers[Y][X]);
					}
				}
			}
		}
		printf("Dangled |%5d| Nodes In all, through recursion, for MaxChildDepth of |%2d|\n", NumberDangled, Y);
		DangleCount[Y] = NumberDangled;
		TotalDangled += NumberDangled;
	}
	printf("\nTotal Number Of Dangled Nodes |%d|\n", TotalDangled);
	NumberOfLivingNodes = TotalNodeSum - TotalDangled;
	printf("\nTotal Number Of Living Nodes |%d|\n", NumberOfLivingNodes);

	printf("\nStep 9 - Count the number of living nodes in the trie before replacement so that we check our numbers.\n");
	// By running the graph tabulation function on a different array, and before we replace the nodes, we can determine if our numbers are correctish.
	TrieGraphTabulate(TemporaryTrie, NodeNumberCounter);
	for ( X = 0; X < MaxStringLength; X++ ) {
		printf( "Count for living nodes of MaxChildDepth |%2d| is |%5d|. It used to be |%6d| and so the number dangled is |%6d| \n", X, NodeNumberCounter[X], NodeNumberCounterInit[X], NodeNumberCounterInit[X] - NodeNumberCounter[X] );
	}
	for ( X = 0; X < MAX; X++ ) {
		TotalDangledCheck += (NodeNumberCounterInit[X] - NodeNumberCounter[X]);
	}
	if ( TotalDangled == TotalDangledCheck ) printf("The total number of nodes dangled adds up.\n");
	else printf("Something went terribly wrong, so fix it.\n");

	printf("\nStep 10 - Dangling is complete, so replace all dangled nodes with their first mexican equivelant in the Trie to make a compressed Dawg.\n");
	// Node replacement has to take place before indices are set up so nothing points to redundant nodes. - This step is absolutely critical.  Mow The Lawn so to speak!  Then assign indicies.
	TrieLawnMower( TemporaryTrie, HolderOfAllTnodePointers );

	printf("\nStep 11.1 - Mowing of the lawn is now complete, so start to assign array indices to all living nodes.\n");
	printf("Step 11.2 - The use of a breadth first queue during this step ensures that lists of contiguous nodes in the array will eliminate the need for a Next pointer.\n\n");
	OrderMatters = BreadthQueueInit();
	// Try to find out if the nodes we are setting are unique before we set them.
	IndexCount = BreadthQueueUseToIndex( OrderMatters, HolderOfAllTnodePointers[MAX - 1][0] );
	printf("Finished indexing.\n");
	printf("NumberOfLivingNodes from after the dangling process|%d|\n", NumberOfLivingNodes);
	printf("IndexCount from the index-handing-out breadth first traversal |%d|\n", IndexCount);
	if ( NumberOfLivingNodes == IndexCount ) printf("The numbers add up properly once again.\n");
	else {
		printf("The Numbers got Scrooged, so you still have some problems to iron out.\n");
		return NULL;
	}

	// Allocate the space needed to store the "Dawg" inside of an array.
	Result = (unsigned int*)calloc((NumberOfLivingNodes + 1), sizeof(unsigned int));
	
	// Roll through the pointer arrays and use the correct "BIT_SHIFT" values to encode the proper unsigned ints.
	// Set the "NULL" entry at the beginning of the array.
	Result[0] = 0;

	printf("\nStep 12 - Populate the unsigned integer array with a bitwise encoding.\n");
	// Traverse the entire 2D pointer array and search for undangled nodes.  When an undangled node is found, encode it, and place it at position "ArrayIndex".
	for ( X = (MaxStringLength - 1); X >= 0; X-- ) {
		for (W = 0; W < NodeNumberCounterInit[X]; W++ ){
			if ( TNODE_DANGLING(HolderOfAllTnodePointers[X][W]) == FALSE ) {
				UnsignedEncodingValue = TNODE_LETTER(HolderOfAllTnodePointers[X][W]) - 'A';
				UnsignedEncodingValue <<= LETTER_BIT_SHIFT;
				UnsignedEncodingValue += (TNODE_END_OF_WORD_FLAG(HolderOfAllTnodePointers[X][W]) == FALSE)? 0: END_OF_WORD_BIT_MASK;
				UnsignedEncodingValue += (TNODE_NEXT(HolderOfAllTnodePointers[X][W]) == NULL)? END_OF_LIST_BIT_MASK: 0;
				UnsignedEncodingValue += (TNODE_CHILD(HolderOfAllTnodePointers[X][W]) == NULL)? 0: TNODE_ARRAY_INDEX(TNODE_CHILD(HolderOfAllTnodePointers[X][W]));
				IndexFollow = TNODE_ARRAY_INDEX(HolderOfAllTnodePointers[X][W]);
				if ( IndexFollow > IndexFollower ) IndexFollower = IndexFollow;
				Result[IndexFollow] = UnsignedEncodingValue;
			}
		}
	}
	printf( "IndexFollower, which is the largest index assigned in the array = |%d|\n", IndexFollower );
	printf( "NumberOfLivingNodes|%d|, assert that these two are equal because they must be.\n", NumberOfLivingNodes );
	if ( IndexFollower == NumberOfLivingNodes ) printf("The numbers add up again, excellent!\n");
	else {
		printf("Don't jump!  You are very close to getting this program working.\n");
		return NULL;
	}
	
	// Do Garbage cleanup and free the whole Trie, which is no longer needed.  Free all nodes from the holding array.
	for ( X = 0; X < MaxStringLength; X++ ) for ( W = 0; W < NodeNumberCounterInit[X]; W++ ) free(HolderOfAllTnodePointers[X][W]);
	free(TemporaryTrie);
	free(NodeNumberCounter);
	free(NodeNumberCounterInit);
	for ( X = 0; X < MaxStringLength; X++ ) if (HolderOfAllTnodePointers[X]!= NULL) free(HolderOfAllTnodePointers[X]);
	free(HolderOfAllTnodePointers);
	
	printf("\nStep 13 - Creation of traditional Dawg is complete, so store it into a text file for verification and a 32-bit binary file for use.\n");
	// We now need to include the "NULL" node at position "0" in the living node collection.
	NumberOfLivingNodes += 1;
	
	Text = fopen(DAWG_TEXT_DATA,"w");
	
	fprintf(Text, "Total number of Dawg nodes = |%d|, including \"0 = NULL\".\n\n", NumberOfLivingNodes);
	
	for ( X = 1; X < NumberOfLivingNodes; X++ ) {
		ConvertUnsignedIntNodeToBinaryString(Result[X], TheNodeInBinary);
		fprintf(Text, "Node|%6d|-Letter|%c|-EOW|%3s|-EOL|%3s|-Child|%6d| - Binary%s\n", X, ((Result[X]&LETTER_BIT_MASK)>>LETTER_BIT_SHIFT) + 'A', (Result[X]&END_OF_WORD_BIT_MASK)? "yes": "no", (Result[X]&END_OF_LIST_BIT_MASK)? "yes": "no", Result[X]&CHILD_INDEX_BIT_MASK, TheNodeInBinary);
	}
	//printf("Beep\n");
	fclose(Text);
	printf("Out of 32 bit traditional text output to file clean.\n");
	
	Data = fopen(DAWG_DATA,"wb");
	// It is critical, especially in a binary file, that the first integer written to the file be the number of nodes stored in the file.
	// Simply write the entire unsigned integer array "Result" into the data file.
	fwrite(&NumberOfLivingNodes, sizeof(int), 1, Data);
	fwrite(Result, sizeof(unsigned int), NumberOfLivingNodes, Data);
	fclose(Data);
	printf("Out of 32 bit traditional data output to file clean.\n");
	return Result;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// The "Main()" function just runs the show.
int main() {
	int X = 0;
	// All of the words of similar length will be stored sequentially in the same array so that there will be (MAX + 1)  arrays in total.  The Smallest length of a string is assumed to be 2.
	char *AllWordsInEnglish[MAX + 1];
	FILE *Input;
	char ThisLine[INPUT_LIMIT];
	unsigned int FirstLineIsSize;
	int LineLength;
	int KeepTracker[MAX + 1];
	int CurrentTracker[MAX + 1];
	int DictionarySizeIndex[MAX + 1];
	int CurrentLength = 0;
	unsigned int *TheLexiconDawg;
	unsigned int Testing;
	char BinaryStringTester[BINARY_STRING_LENGTH];
	
	printf("The main function lives\n");
	
	for ( X = 0; X <= MAX; X++ ) AllWordsInEnglish[X] = NULL;
	Input = fopen(RAW_LEXICON,"r");
	fgets(ThisLine, INPUT_LIMIT, Input);
	
	// Correction is needed to get rid of the new line character that "fgets()" appends to the string.
	CUT_OFF_NEW_LINE(ThisLine);
	LineLength = strlen(ThisLine);
	printf("ThisLine is |%s|\n", ThisLine);
	FirstLineIsSize = StringToUnsignedInt(ThisLine);
	printf("FirstLineIsSize is |%u|\n", FirstLineIsSize);
	
	// Read the memory straight into ram using dynamically allocated space to count the words of each length.
	for ( X = 0; X <= MAX; X++ ) KeepTracker[X] = 0;
	char **LexiconInRam = (char**)malloc(FirstLineIsSize*sizeof(char*)); 
	
	// The first line gives us the number of words so read in all of them into ram temporarily.
	for ( X = 0; X < FirstLineIsSize; X++ ) {
		fgets(ThisLine, INPUT_LIMIT, Input);
		CUT_OFF_NEW_LINE(ThisLine);
		MakeMeAllCapital(ThisLine);
		LineLength = strlen( ThisLine );
		if ( LineLength <= MAX ) KeepTracker[LineLength] += 1;
		LexiconInRam[X] = (char*)malloc((LineLength + 1)*sizeof(char));
		strcpy(LexiconInRam[X], ThisLine);
	}
	printf("Lexicon.txt read is now complete\n\n");
	for ( X = 0; X <= MAX; X++ ) printf("There are |%5d| words of length |%2d|\n", KeepTracker[X], X);
	// Allocate enough space to hold all of the words in strings so that we can add them to the trie by length.
	for ( X = MIN; X <= MAX; X++ ) AllWordsInEnglish[X] = (char*)malloc((X + 1)*KeepTracker[X]*sizeof(char));
	printf("\nInitial malloc() complete\n");
	
	for ( X = 0; X <= MAX; X++ ) CurrentTracker[X] = 0;
	// Copy all of the strings into "AllWordsInEnglish".
	for ( X = 0; X < FirstLineIsSize; X++ ) {
		CurrentLength = strlen(LexiconInRam[X]);
		// As convoluted as this command may appear, it simply copies a string from its temporary ram location to the array of length equivelant strings for adding to the intermediate "Trie".
		if ( CurrentLength <= MAX ) strcpy(&((AllWordsInEnglish[CurrentLength])[(CurrentTracker[CurrentLength]*(CurrentLength + 1))]), LexiconInRam[X]);
		CurrentTracker[CurrentLength] += 1;
	}
	printf("The words have now been sorted by length\n");
	
	// Make sure that the counting has resulted in all of the strings being placed correctly.
	for ( X = 0; X < (MAX + 1); X++ ) {
		if ( KeepTracker[X] != CurrentTracker[X] ) {
			printf("The number of words is not adding up properly, so fix it.\n");
			return 0;
		}
	}
	
	// Free the initial ram read space
	for ( X = 0; X < FirstLineIsSize; X++ ) free(LexiconInRam[X]);
	free(LexiconInRam);
	
	for ( X = 0; X <= MAX; X++ ) DictionarySizeIndex[X] = KeepTracker[X];
	printf( "The Dawg init function will now be run, so be patient, it will take some time to complete.\n" );
	TheLexiconDawg = DawgInit(AllWordsInEnglish, DictionarySizeIndex, MAX, MIN);
	
	// Free up the array that holds the uncompressed English language.
	for ( X = 0; X <= MAX; X++ ) if ( AllWordsInEnglish[X] != NULL ) free(AllWordsInEnglish[X]);
	
	return 0;
}
